/**
 * Storage adapter — Local, Cloudflare R2, Backblaze B2, BunnyCDN, custom S3.
 * The active provider and its credentials are read from app_settings.
 *
 * All local paths go through resolveUploadPath(); all object keys go through
 * objectKey(). Uploads stream from disk (never buffer the whole file), and
 * remote reads support HTTP Range so video seeking works on every provider.
 */
import fs from "fs";
import path from "path";
import { Readable } from "stream";
import pool from "../db/connection.js";
import { resolveUploadPath, uploadDir, isSafeStoredName, UPLOAD_SUBFOLDERS } from "./paths.js";
import { parseRange } from "./media.js";

// ── Settings cache (60 s) ─────────────────────────────────────────────────────
let cachedSettings = null;
let cacheTime = 0;
const CACHE_TTL = 60_000;

async function getStorageSettings() {
  if (cachedSettings && Date.now() - cacheTime < CACHE_TTL) return cachedSettings;
  try {
    const [rows] = await pool.query("SELECT id, value FROM app_settings WHERE id LIKE 'storage\\_%'");
    const settings = {};
    rows.forEach((r) => { settings[r.id] = r.value; });
    cachedSettings = settings;
    cacheTime = Date.now();
    return settings;
  } catch {
    return cachedSettings || {};
  }
}

export function clearStorageCache() {
  cachedSettings = null;
  cacheTime = 0;
}

export async function getActiveProvider() {
  const settings = await getStorageSettings();
  return settings.storage_provider || "local";
}

/** Object key for cloud providers; refuses anything that is not a single safe segment. */
function objectKey(storedName, subfolder) {
  if (!UPLOAD_SUBFOLDERS.includes(subfolder) || !isSafeStoredName(storedName)) {
    throw new Error("Unsafe storage key.");
  }
  return subfolder ? `${subfolder}/${storedName}` : storedName;
}

// ── UPLOAD ────────────────────────────────────────────────────────────────────
// filePath: absolute path of the file multer wrote; storedName: server-generated.
export async function uploadToStorage(filePath, storedName, subfolder = "") {
  const provider = await getActiveProvider();
  if (provider === "local") return uploadLocal(filePath, storedName, subfolder);

  const settings = await getStorageSettings();
  if (provider === "r2" || provider === "s3" || provider === "b2") {
    return uploadS3Compatible(filePath, storedName, subfolder, settings, provider);
  }
  if (provider === "bunny") return uploadBunny(filePath, storedName, subfolder, settings);
  return uploadLocal(filePath, storedName, subfolder);
}

// ── READ ──────────────────────────────────────────────────────────────────────
/**
 * Opens a stored object from the active cloud provider.
 * @param rangeHeader raw HTTP Range header (optional)
 * @returns null if not found, or
 *   { stream, size, partial, start, end } — stream is a Node Readable, or
 *   { unsatisfiable: true, size }
 */
export async function openRemoteObject(storedName, subfolder = "", rangeHeader) {
  const provider = await getActiveProvider();
  if (provider === "local") return null;
  const settings = await getStorageSettings();
  const key = objectKey(storedName, subfolder);

  if (provider === "r2" || provider === "s3" || provider === "b2") {
    return openS3Compatible(key, settings, provider, rangeHeader);
  }
  if (provider === "bunny") return openBunny(key, settings, rangeHeader);
  return null;
}

/** Whole-object stream (local first). Kept for callers that don't need ranges. */
export async function getFileStream(storedName, subfolder = "") {
  const localPath = resolveUploadPath(storedName, subfolder);
  if (!localPath) return null;
  if (fs.existsSync(localPath)) {
    const stat = fs.statSync(localPath);
    return { stream: fs.createReadStream(localPath), size: stat.size, localPath };
  }
  return openRemoteObject(storedName, subfolder);
}

// ── DELETE ────────────────────────────────────────────────────────────────────
export async function deleteFromStorage(storedName, subfolder = "") {
  const localPath = resolveUploadPath(storedName, subfolder);
  if (!localPath) {
    console.warn("Refused to delete unsafe stored name.");
    return false;
  }

  let deletedLocal = false;
  if (fs.existsSync(localPath)) {
    fs.unlinkSync(localPath);
    deletedLocal = true;
  }

  const provider = await getActiveProvider();
  if (provider === "local") return deletedLocal;

  const settings = await getStorageSettings();
  const key = objectKey(storedName, subfolder);
  try {
    if (provider === "r2" || provider === "s3" || provider === "b2") {
      await deleteS3Compatible(key, settings, provider);
    } else if (provider === "bunny") {
      await deleteBunny(key, settings);
    }
  } catch {
    // Object may not exist on the cloud provider (uploaded while local).
  }
  return true;
}

// ══════════════════════════════════════════════════════════════════════════════
// LOCAL
// ══════════════════════════════════════════════════════════════════════════════

function uploadLocal(filePath, storedName, subfolder) {
  const destPath = resolveUploadPath(storedName, subfolder);
  if (!destPath) throw new Error("Unsafe storage key.");
  fs.mkdirSync(uploadDir(subfolder), { recursive: true });
  // Multer already wrote the file to its final place; only copy if it lives elsewhere.
  if (path.resolve(filePath) !== destPath) fs.copyFileSync(filePath, destPath);
  const publicUrl = subfolder ? `/${subfolder}/${storedName}` : `/uploads/${storedName}`;
  return { provider: "local", storagePath: destPath, publicUrl };
}

// ══════════════════════════════════════════════════════════════════════════════
// S3-COMPATIBLE (R2, B2, custom S3)
// ══════════════════════════════════════════════════════════════════════════════

async function getS3Client(settings, provider) {
  const { S3Client } = await import("@aws-sdk/client-s3");
  let endpoint, region, accessKeyId, secretAccessKey;

  if (provider === "r2") {
    endpoint = `https://${settings.storage_r2_account_id || ""}.r2.cloudflarestorage.com`;
    region = "auto";
    accessKeyId = settings.storage_r2_access_key || "";
    secretAccessKey = settings.storage_r2_secret_key || "";
  } else if (provider === "b2") {
    endpoint = settings.storage_b2_endpoint || "";
    region = settings.storage_b2_region || "us-west-004";
    accessKeyId = settings.storage_b2_key_id || "";
    secretAccessKey = settings.storage_b2_app_key || "";
  } else {
    endpoint = settings.storage_s3_endpoint || "";
    region = settings.storage_s3_region || "us-east-1";
    accessKeyId = settings.storage_s3_access_key || "";
    secretAccessKey = settings.storage_s3_secret_key || "";
  }

  return new S3Client({ endpoint, region, credentials: { accessKeyId, secretAccessKey }, forcePathStyle: true });
}

function getBucket(settings, provider) {
  if (provider === "r2") return settings.storage_r2_bucket || "vidora";
  if (provider === "b2") return settings.storage_b2_bucket || "vidora";
  return settings.storage_s3_bucket || "vidora";
}

function getPublicBaseUrl(settings, provider) {
  if (provider === "r2") return settings.storage_r2_public_url || "";
  if (provider === "b2") return settings.storage_b2_public_url || "";
  return settings.storage_s3_public_url || "";
}

async function uploadS3Compatible(filePath, storedName, subfolder, settings, provider) {
  const { Upload } = await import("@aws-sdk/lib-storage");
  const { default: mime } = await import("mime-types");
  const client = await getS3Client(settings, provider);
  const key = objectKey(storedName, subfolder);

  // Multipart, streamed from disk — memory use is bounded by partSize × queueSize.
  const upload = new Upload({
    client,
    params: {
      Bucket: getBucket(settings, provider),
      Key: key,
      Body: fs.createReadStream(filePath),
      ContentType: mime.lookup(storedName) || "application/octet-stream",
    },
    partSize: 16 * 1024 * 1024,
    queueSize: 4,
  });
  await upload.done();

  const baseUrl = getPublicBaseUrl(settings, provider);
  const publicUrl = baseUrl ? `${baseUrl.replace(/\/$/, "")}/${key}` : key;
  return { provider, storagePath: key, publicUrl };
}

async function openS3Compatible(key, settings, provider, rangeHeader) {
  const { GetObjectCommand, HeadObjectCommand } = await import("@aws-sdk/client-s3");
  const client = await getS3Client(settings, provider);
  const Bucket = getBucket(settings, provider);

  let size;
  try {
    size = (await client.send(new HeadObjectCommand({ Bucket, Key: key }))).ContentLength;
  } catch (err) {
    if (err?.$metadata?.httpStatusCode === 404 || err?.name === "NotFound") return null;
    throw err;
  }

  const range = parseRange(rangeHeader, size);
  if (range === "unsatisfiable") return { unsatisfiable: true, size };

  const response = await client.send(new GetObjectCommand({
    Bucket,
    Key: key,
    ...(range ? { Range: `bytes=${range.start}-${range.end}` } : {}),
  }));
  return range
    ? { stream: response.Body, size, partial: true, start: range.start, end: range.end }
    : { stream: response.Body, size, partial: false };
}

async function deleteS3Compatible(key, settings, provider) {
  const { DeleteObjectCommand } = await import("@aws-sdk/client-s3");
  const client = await getS3Client(settings, provider);
  await client.send(new DeleteObjectCommand({ Bucket: getBucket(settings, provider), Key: key }));
}

// ══════════════════════════════════════════════════════════════════════════════
// BUNNYCDN STORAGE
// ══════════════════════════════════════════════════════════════════════════════

function bunnyEndpoint(key, settings) {
  const region = settings.storage_bunny_region || ""; // empty = Falkenstein
  const hostname = region ? `${region}.storage.bunnycdn.com` : "storage.bunnycdn.com";
  return `https://${hostname}/${settings.storage_bunny_zone || ""}/${key}`;
}

async function uploadBunny(filePath, storedName, subfolder, settings, fetchImpl = fetch) {
  const key = objectKey(storedName, subfolder);
  const { size } = fs.statSync(filePath);

  const response = await fetchImpl(bunnyEndpoint(key, settings), {
    method: "PUT",
    headers: {
      AccessKey: settings.storage_bunny_api_key || "",
      "Content-Type": "application/octet-stream",
      "Content-Length": String(size),
    },
    body: fs.createReadStream(filePath), // streamed, not buffered
    duplex: "half",
  });
  if (!response.ok) throw new Error(`BunnyCDN upload failed: ${response.status}`);

  const cdnUrl = settings.storage_bunny_cdn_url || `https://${settings.storage_bunny_zone || ""}.b-cdn.net`;
  return { provider: "bunny", storagePath: key, publicUrl: `${cdnUrl.replace(/\/$/, "")}/${key}` };
}

/** Total size from `Content-Range: bytes 0-99/1234`. */
function totalFromContentRange(value) {
  const m = /\/(\d+)\s*$/.exec(value || "");
  return m ? Number(m[1]) : undefined;
}

/**
 * Bunny's storage API returns a WHATWG ReadableStream; Express needs a Node
 * Readable. Range requests are forwarded; if Bunny ignores the Range header
 * (200 instead of 206) the whole object is returned as a normal response.
 */
export async function openBunny(key, settings, rangeHeader, fetchImpl = fetch) {
  const headers = { AccessKey: settings.storage_bunny_api_key || "" };
  const wantsRange = typeof rangeHeader === "string" && /^bytes=\d*-\d*$/.test(rangeHeader.trim());
  if (wantsRange) headers.Range = rangeHeader.trim();

  const response = await fetchImpl(bunnyEndpoint(key, settings), { headers });

  if (response.status === 416) {
    return { unsatisfiable: true, size: totalFromContentRange(response.headers.get("content-range")) ?? 0 };
  }
  if (!response.ok || !response.body) return null;

  const stream = Readable.fromWeb(response.body);
  if (response.status === 206) {
    const contentRange = response.headers.get("content-range") || "";
    const m = /bytes (\d+)-(\d+)\/(\d+)/.exec(contentRange);
    if (m) return { stream, partial: true, start: Number(m[1]), end: Number(m[2]), size: Number(m[3]) };
  }
  return { stream, partial: false, size: Number(response.headers.get("content-length")) || undefined };
}

async function deleteBunny(key, settings) {
  const response = await fetch(bunnyEndpoint(key, settings), {
    method: "DELETE",
    headers: { AccessKey: settings.storage_bunny_api_key || "" },
  });
  return response.ok;
}

// Exposed for unit tests only.
export const __test = { uploadBunny, objectKey, totalFromContentRange };

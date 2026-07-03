/**
 * Storage Adapter — supports Local, Cloudflare R2, Backblaze B2, BunnyCDN, Custom S3
 * Active provider is read from app_settings table.
 * All providers expose: upload(filePath, storedName), delete(storedName), getStream(storedName)
 */

import fs from "fs";
import path from "path";
import pool from "../db/connection.js";

const UPLOADS_DIR = path.resolve("uploads");

// ── Cache settings for 60s to avoid DB hit on every request ───────────────────
let cachedSettings = null;
let cacheTime = 0;
const CACHE_TTL = 60_000; // 1 minute

async function getStorageSettings() {
  if (cachedSettings && Date.now() - cacheTime < CACHE_TTL) return cachedSettings;
  try {
    const [rows] = await pool.query("SELECT id, value FROM app_settings WHERE id LIKE 'storage_%'");
    const settings = {};
    rows.forEach(r => { settings[r.id] = r.value; });
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

// ── Get active provider ───────────────────────────────────────────────────────
export async function getActiveProvider() {
  const settings = await getStorageSettings();
  return settings.storage_provider || "local";
}

// ── UPLOAD ────────────────────────────────────────────────────────────────────
// filePath = absolute path to temp file on disk (from multer)
// storedName = unique filename (uuid.ext)
// subfolder = "" for files, "thumbnails" for thumbs
export async function uploadToStorage(filePath, storedName, subfolder = "") {
  const provider = await getActiveProvider();

  if (provider === "local") {
    return uploadLocal(filePath, storedName, subfolder);
  }

  const settings = await getStorageSettings();

  if (provider === "r2" || provider === "s3") {
    return uploadS3Compatible(filePath, storedName, subfolder, settings, provider);
  }
  if (provider === "b2") {
    return uploadS3Compatible(filePath, storedName, subfolder, settings, "b2");
  }
  if (provider === "bunny") {
    return uploadBunny(filePath, storedName, subfolder, settings);
  }

  // Fallback to local
  return uploadLocal(filePath, storedName, subfolder);
}

// ── GET STREAM (for serving files) ────────────────────────────────────────────
// Returns { stream, size, contentType } or throws
export async function getFileStream(storedName, subfolder = "") {
  const provider = await getActiveProvider();

  // Check if file exists locally first (for backward compat with old files)
  const localPath = subfolder
    ? path.join(UPLOADS_DIR, subfolder, storedName)
    : path.join(UPLOADS_DIR, storedName);

  if (fs.existsSync(localPath)) {
    const stat = fs.statSync(localPath);
    return { stream: fs.createReadStream(localPath), size: stat.size, localPath };
  }

  // If not local, fetch from cloud
  if (provider === "local") {
    return null; // File not found
  }

  const settings = await getStorageSettings();

  if (provider === "r2" || provider === "s3" || provider === "b2") {
    return getStreamS3Compatible(storedName, subfolder, settings, provider);
  }
  if (provider === "bunny") {
    return getStreamBunny(storedName, subfolder, settings);
  }

  return null;
}

// ── GET STREAM WITH RANGE SUPPORT ─────────────────────────────────────────────
export async function getFileStreamRange(storedName, subfolder = "", start, end) {
  const localPath = subfolder
    ? path.join(UPLOADS_DIR, subfolder, storedName)
    : path.join(UPLOADS_DIR, storedName);

  if (fs.existsSync(localPath)) {
    const stat = fs.statSync(localPath);
    const streamEnd = end !== undefined ? end : stat.size - 1;
    return {
      stream: fs.createReadStream(localPath, { start, end: streamEnd }),
      size: stat.size,
      start,
      end: streamEnd,
      localPath,
    };
  }

  // Cloud range support — fetch full and skip (not ideal but works)
  // For production, use signed URLs with range headers
  const provider = await getActiveProvider();
  const settings = await getStorageSettings();

  if (provider === "r2" || provider === "s3" || provider === "b2") {
    return getStreamS3CompatibleRange(storedName, subfolder, settings, provider, start, end);
  }

  return null;
}

// ── DELETE ─────────────────────────────────────────────────────────────────────
export async function deleteFromStorage(storedName, subfolder = "") {
  const provider = await getActiveProvider();

  // Always try to delete locally
  const localPath = subfolder
    ? path.join(UPLOADS_DIR, subfolder, storedName)
    : path.join(UPLOADS_DIR, storedName);

  let deletedLocal = false;
  if (fs.existsSync(localPath)) {
    fs.unlinkSync(localPath);
    deletedLocal = true;
  }

  // Also delete from cloud if provider is not local
  if (provider !== "local") {
    const settings = await getStorageSettings();
    try {
      if (provider === "r2" || provider === "s3" || provider === "b2") {
        await deleteS3Compatible(storedName, subfolder, settings, provider);
      } else if (provider === "bunny") {
        await deleteBunny(storedName, subfolder, settings);
      }
    } catch (e) {
      // Cloud delete failed — file might not exist there, continue
    }
    return true;
  }

  return deletedLocal;
}

// ══════════════════════════════════════════════════════════════════════════════
// LOCAL PROVIDER
// ══════════════════════════════════════════════════════════════════════════════

function uploadLocal(filePath, storedName, subfolder) {
  const destDir = subfolder ? path.join(UPLOADS_DIR, subfolder) : UPLOADS_DIR;
  if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
  const destPath = path.join(destDir, storedName);

  // If file is already in the right place (multer saved it there), skip
  if (path.resolve(filePath) !== path.resolve(destPath)) {
    fs.copyFileSync(filePath, destPath);
  }

  const publicUrl = subfolder ? `/${subfolder}/${storedName}` : `/uploads/${storedName}`;
  return { provider: "local", storagePath: destPath, publicUrl };
}

// ══════════════════════════════════════════════════════════════════════════════
// S3-COMPATIBLE (R2, B2, Custom S3)
// ══════════════════════════════════════════════════════════════════════════════

async function getS3Client(settings, provider) {
  const { S3Client } = await import("@aws-sdk/client-s3");

  let endpoint, region, accessKeyId, secretAccessKey;

  if (provider === "r2") {
    const accountId = settings.storage_r2_account_id || "";
    endpoint = `https://${accountId}.r2.cloudflarestorage.com`;
    region = "auto";
    accessKeyId = settings.storage_r2_access_key || "";
    secretAccessKey = settings.storage_r2_secret_key || "";
  } else if (provider === "b2") {
    endpoint = settings.storage_b2_endpoint || "";
    region = settings.storage_b2_region || "us-west-004";
    accessKeyId = settings.storage_b2_key_id || "";
    secretAccessKey = settings.storage_b2_app_key || "";
  } else {
    // Custom S3
    endpoint = settings.storage_s3_endpoint || "";
    region = settings.storage_s3_region || "us-east-1";
    accessKeyId = settings.storage_s3_access_key || "";
    secretAccessKey = settings.storage_s3_secret_key || "";
  }

  return new S3Client({
    endpoint,
    region,
    credentials: { accessKeyId, secretAccessKey },
    forcePathStyle: true,
  });
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
  const { PutObjectCommand } = await import("@aws-sdk/client-s3");
  const client = await getS3Client(settings, provider);
  const bucket = getBucket(settings, provider);
  const key = subfolder ? `${subfolder}/${storedName}` : storedName;

  const fileBuffer = fs.readFileSync(filePath);
  const { default: mime } = await import("mime-types");
  const contentType = mime.lookup(storedName) || "application/octet-stream";

  await client.send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: fileBuffer,
    ContentType: contentType,
  }));

  const baseUrl = getPublicBaseUrl(settings, provider);
  const publicUrl = baseUrl ? `${baseUrl.replace(/\/$/, "")}/${key}` : key;

  // Remove local temp file if it's in uploads (multer put it there)
  const localPath = subfolder
    ? path.join(UPLOADS_DIR, subfolder, storedName)
    : path.join(UPLOADS_DIR, storedName);
  if (fs.existsSync(localPath) && path.resolve(filePath) === path.resolve(localPath)) {
    // Keep local copy as cache? Or delete to save space:
    // fs.unlinkSync(localPath); // uncomment to save disk space
  }

  return { provider, storagePath: key, publicUrl };
}

async function getStreamS3Compatible(storedName, subfolder, settings, provider) {
  const { GetObjectCommand } = await import("@aws-sdk/client-s3");
  const client = await getS3Client(settings, provider);
  const bucket = getBucket(settings, provider);
  const key = subfolder ? `${subfolder}/${storedName}` : storedName;

  const response = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  return {
    stream: response.Body,
    size: response.ContentLength,
  };
}

async function getStreamS3CompatibleRange(storedName, subfolder, settings, provider, start, end) {
  const { GetObjectCommand } = await import("@aws-sdk/client-s3");
  const client = await getS3Client(settings, provider);
  const bucket = getBucket(settings, provider);
  const key = subfolder ? `${subfolder}/${storedName}` : storedName;

  // First get size with HEAD
  const { HeadObjectCommand } = await import("@aws-sdk/client-s3");
  const head = await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
  const totalSize = head.ContentLength;
  const rangeEnd = end !== undefined ? end : totalSize - 1;

  const response = await client.send(new GetObjectCommand({
    Bucket: bucket,
    Key: key,
    Range: `bytes=${start}-${rangeEnd}`,
  }));

  return {
    stream: response.Body,
    size: totalSize,
    start,
    end: rangeEnd,
  };
}

async function deleteS3Compatible(storedName, subfolder, settings, provider) {
  const { DeleteObjectCommand } = await import("@aws-sdk/client-s3");
  const client = await getS3Client(settings, provider);
  const bucket = getBucket(settings, provider);
  const key = subfolder ? `${subfolder}/${storedName}` : storedName;

  await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
  return true;
}

// ══════════════════════════════════════════════════════════════════════════════
// BUNNYCDN STORAGE
// ══════════════════════════════════════════════════════════════════════════════

async function uploadBunny(filePath, storedName, subfolder, settings) {
  const storageZone = settings.storage_bunny_zone || "";
  const apiKey = settings.storage_bunny_api_key || "";
  const region = settings.storage_bunny_region || ""; // empty = Falkenstein
  const hostname = region ? `${region}.storage.bunnycdn.com` : "storage.bunnycdn.com";
  const filePath2 = subfolder ? `${subfolder}/${storedName}` : storedName;

  const fileBuffer = fs.readFileSync(filePath);

  const response = await fetch(`https://${hostname}/${storageZone}/${filePath2}`, {
    method: "PUT",
    headers: { AccessKey: apiKey, "Content-Type": "application/octet-stream" },
    body: fileBuffer,
  });

  if (!response.ok) throw new Error(`BunnyCDN upload failed: ${response.status}`);

  const cdnUrl = settings.storage_bunny_cdn_url || `https://${storageZone}.b-cdn.net`;
  const publicUrl = `${cdnUrl.replace(/\/$/, "")}/${filePath2}`;

  return { provider: "bunny", storagePath: filePath2, publicUrl };
}

async function getStreamBunny(storedName, subfolder, settings) {
  const storageZone = settings.storage_bunny_zone || "";
  const apiKey = settings.storage_bunny_api_key || "";
  const region = settings.storage_bunny_region || "";
  const hostname = region ? `${region}.storage.bunnycdn.com` : "storage.bunnycdn.com";
  const filePath2 = subfolder ? `${subfolder}/${storedName}` : storedName;

  const response = await fetch(`https://${hostname}/${storageZone}/${filePath2}`, {
    headers: { AccessKey: apiKey },
  });

  if (!response.ok) return null;

  return {
    stream: response.body,
    size: parseInt(response.headers.get("content-length") || "0"),
  };
}

async function deleteBunny(storedName, subfolder, settings) {
  const storageZone = settings.storage_bunny_zone || "";
  const apiKey = settings.storage_bunny_api_key || "";
  const region = settings.storage_bunny_region || "";
  const hostname = region ? `${region}.storage.bunnycdn.com` : "storage.bunnycdn.com";
  const filePath2 = subfolder ? `${subfolder}/${storedName}` : storedName;

  const response = await fetch(`https://${hostname}/${storageZone}/${filePath2}`, {
    method: "DELETE",
    headers: { AccessKey: apiKey },
  });

  return response.ok;
}

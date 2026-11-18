/**
 * Serving stored files over HTTP — one implementation for every endpoint that
 * streams user content (/api/play, /api/stream/:token/video).
 */
import fs from "fs";
import { resolveUploadPath } from "./paths.js";

/**
 * Parses a single-range `Range` header (RFC 9110 §14.1.2).
 *
 * @returns null when the header is absent, malformed or multi-range (serve the
 *          whole file), "unsatisfiable" when the range cannot be served (416),
 *          or { start, end } with inclusive byte offsets.
 */
export function parseRange(header, size) {
  if (!header || typeof header !== "string") return null;
  const m = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!m) return null;
  const [, rawStart, rawEnd] = m;
  if (rawStart === "" && rawEnd === "") return null;

  let start;
  let end;
  if (rawStart === "") {
    // Suffix range: the last N bytes.
    const suffix = Number(rawEnd);
    if (suffix === 0 || size === 0) return "unsatisfiable";
    start = Math.max(0, size - suffix);
    end = size - 1;
  } else {
    start = Number(rawStart);
    end = rawEnd === "" ? size - 1 : Math.min(Number(rawEnd), size - 1);
  }
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start >= size || start > end) {
    return "unsatisfiable";
  }
  return { start, end };
}

/** Media types a browser may render inline. Everything else is a download. */
const INLINE_TYPE = /^(video|audio)\/[\w.+-]+$|^image\/(png|jpe?g|gif|webp|avif|bmp)$/i;

/**
 * Headers that stop uploaded content from ever executing as a web page on the
 * API origin, whatever MIME type the uploader claimed.
 */
export function setContentSafetyHeaders(res, mimeType) {
  const inline = INLINE_TYPE.test(mimeType || "");
  res.setHeader("Content-Type", inline ? mimeType : "application/octet-stream");
  if (!inline) res.setHeader("Content-Disposition", "attachment");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Content-Security-Policy", "default-src 'none'; sandbox");
  res.setHeader("Cache-Control", "no-store, private");
}

function pipeStream(stream, res, onDelivered, delivery) {
  let ended = false;
  let observedBytes = 0;
  stream.on("data", (chunk) => { observedBytes += chunk.length; });
  stream.on("end", () => { ended = true; });
  if (onDelivered) res.once("finish", () => {
    if (ended) Promise.resolve(onDelivered({ ...delivery, bytes: observedBytes }))
      .catch((err) => console.error("Delivery evidence error:", err.message));
  });
  stream.on("error", (err) => {
    console.error("Media stream error:", err.message);
    res.destroy(err);
  });
  stream.pipe(res);
}

/**
 * Streams a `files` row ({ id, stored_name, mime_type }) with Range support.
 * Local disk first (legacy and local provider), then the configured cloud
 * provider. Unsafe stored names are refused, never resolved.
 */
export async function sendStoredFile(req, res, file, onDelivered) {
  const localPath = resolveUploadPath(file.stored_name);
  if (!localPath) {
    console.warn(`Refused to serve file ${file.id}: unsafe stored_name.`);
    return res.status(404).json({ success: false, message: "File not found." });
  }

  res.setHeader("Accept-Ranges", "bytes");

  let stat = null;
  try { stat = await fs.promises.stat(localPath); } catch { /* not on local disk */ }

  if (stat && stat.isFile()) {
    const range = parseRange(req.headers.range, stat.size);
    setContentSafetyHeaders(res, file.mime_type);
    if (range === "unsatisfiable") {
      res.setHeader("Content-Range", `bytes */${stat.size}`);
      return res.status(416).end();
    }
    if (range) {
      res.status(206);
      res.setHeader("Content-Range", `bytes ${range.start}-${range.end}/${stat.size}`);
      res.setHeader("Content-Length", range.end - range.start + 1);
      return pipeStream(fs.createReadStream(localPath, range), res, onDelivered,
        { start: range.start, bytes: range.end - range.start + 1, total: stat.size });
    }
    res.setHeader("Content-Length", stat.size);
    return pipeStream(fs.createReadStream(localPath), res, onDelivered,
      { start: 0, bytes: stat.size, total: stat.size });
  }

  // Not on local disk — ask the active cloud provider.
  const { openRemoteObject } = await import("./storage.js");
  const remote = await openRemoteObject(file.stored_name, "", req.headers.range);
  if (!remote) return res.status(404).json({ success: false, message: "File not on storage." });

  setContentSafetyHeaders(res, file.mime_type);
  if (remote.unsatisfiable) {
    res.setHeader("Content-Range", `bytes */${remote.size}`);
    return res.status(416).end();
  }
  if (remote.partial) {
    res.status(206);
    res.setHeader("Content-Range", `bytes ${remote.start}-${remote.end}/${remote.size}`);
    res.setHeader("Content-Length", remote.end - remote.start + 1);
  } else if (remote.size) {
    res.setHeader("Content-Length", remote.size);
  }
  return pipeStream(remote.stream, res, onDelivered,
    { start: remote.partial ? remote.start : 0,
      bytes: remote.partial ? remote.end - remote.start + 1 : remote.size,
      total: remote.size });
}

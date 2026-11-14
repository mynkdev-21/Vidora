/**
 * Safe filesystem paths for uploaded content.
 *
 * Every read, write or delete of an uploaded file must resolve its path through
 * resolveUploadPath(). Stored names are server-generated, but legacy rows (and
 * rows created through the removed metadata endpoint) may contain anything, so
 * the name is treated as untrusted on every use.
 */
import path from "path";
import crypto from "crypto";
import { config } from "../config.js";

/** Sub-directories of the uploads root that may hold user content. */
export const UPLOAD_SUBFOLDERS = Object.freeze(["", "thumbnails", "avatars", "receipts"]);

/**
 * A stored name must be a single path segment: no separators, no NUL, no
 * leading dot (which also rules out "." and ".."). Legacy names are
 * `<uuid><extension of the original filename>`, so the extension part may
 * contain unusual characters — containment is enforced separately below.
 */
export function isSafeStoredName(name) {
  return typeof name === "string"
    && name.length > 0
    && name.length <= 255
    && !name.startsWith(".")
    && !/[\\/\0]/.test(name);
}

/**
 * Returns the absolute path of an uploaded file, or null when the name or
 * subfolder is unsafe. The resolved path is guaranteed to sit directly inside
 * <uploadsDir>/<subfolder>.
 */
export function resolveUploadPath(storedName, subfolder = "", root = config.uploadsDir) {
  if (!UPLOAD_SUBFOLDERS.includes(subfolder) || !isSafeStoredName(storedName)) return null;
  const base = path.resolve(root, subfolder);
  const full = path.resolve(base, storedName);
  return path.dirname(full) === base ? full : null;
}

/** Absolute path of an uploads subfolder (always inside the uploads root). */
export function uploadDir(subfolder = "", root = config.uploadsDir) {
  if (!UPLOAD_SUBFOLDERS.includes(subfolder)) throw new Error(`Unknown upload folder: ${subfolder}`);
  return path.resolve(root, subfolder);
}

/**
 * Lower-cased extension of a client filename, only if it is plain
 * alphanumeric (".mp4", ".webm"); otherwise "". Never trust the rest of the
 * client filename.
 */
export function safeExtension(originalName) {
  const ext = path.extname(String(originalName || "")).toLowerCase();
  return /^\.[a-z0-9]{1,10}$/.test(ext) ? ext : "";
}

/** Server-generated stored name: random UUID + sanitised extension. */
export function generateStoredName(originalName, prefix = "") {
  return `${prefix}${crypto.randomUUID()}${safeExtension(originalName)}`;
}

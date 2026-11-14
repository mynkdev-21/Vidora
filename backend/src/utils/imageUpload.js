/**
 * Image uploads (avatars, payout receipts) — audit finding P2b.
 *
 * The client controls both the filename and the declared MIME type, so
 * neither decides how the file is stored or served:
 *   - only raster image types on the allowlist are accepted (no SVG/HTML);
 *   - the extension is chosen by the server from the accepted type;
 *   - after upload the file's magic bytes must match that type, otherwise it
 *     is deleted and the request rejected.
 */
import fs from "fs";
import crypto from "crypto";
import multer from "multer";
import { uploadDir } from "./paths.js";
import { config } from "../config.js";

const IMAGE_TYPES = Object.freeze({
  "image/jpeg": { ext: ".jpg", matches: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  "image/png":  { ext: ".png", matches: (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  "image/gif":  { ext: ".gif", matches: (b) => b.subarray(0, 4).toString("latin1") === "GIF8" },
  "image/webp": { ext: ".webp", matches: (b) => b.subarray(0, 4).toString("latin1") === "RIFF" && b.subarray(8, 12).toString("latin1") === "WEBP" },
});

export const ALLOWED_IMAGE_TYPES = Object.keys(IMAGE_TYPES);

/** Multer instance storing one image in <uploads>/<subfolder> under a server-generated name. */
export function imageUploader(subfolder, prefix) {
  const dir = uploadDir(subfolder);
  fs.mkdirSync(dir, { recursive: true });

  return multer({
    storage: multer.diskStorage({
      destination: (_req, _file, cb) => cb(null, dir),
      filename: (_req, file, cb) => cb(null, `${prefix}${crypto.randomUUID()}${IMAGE_TYPES[file.mimetype].ext}`),
    }),
    limits: { fileSize: config.maxImageUploadBytes, files: 1, fields: 5 },
    fileFilter: (_req, file, cb) => {
      if (IMAGE_TYPES[file.mimetype]) cb(null, true);
      else cb(Object.assign(new Error("Only JPEG, PNG, GIF or WebP images are allowed."), { status: 400 }));
    },
  });
}

/** Rejects (and deletes) an uploaded image whose content doesn't match its declared type. */
export async function verifyImageContent(req, res, next) {
  if (!req.file) return next();
  try {
    const fh = await fs.promises.open(req.file.path, "r");
    const { buffer } = await fh.read(Buffer.alloc(16), 0, 16, 0);
    await fh.close();
    if (IMAGE_TYPES[req.file.mimetype]?.matches(buffer)) return next();
  } catch { /* fall through to rejection */ }
  await fs.promises.unlink(req.file.path).catch(() => {});
  res.status(400).json({ success: false, message: "The file is not a valid image." });
}

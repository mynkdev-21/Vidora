import { randomUUID as uuidv4 } from "crypto";
import fs from "fs";
import pool from "../db/connection.js";
import { config } from "../config.js";
import { generateThumbnail, isVideo } from "../utils/thumbnail.js";
import { uploadDir } from "../utils/paths.js";
import { copySharedFile, CopyError } from "../services/file-copy.service.js";

// ── Ensure directories exist ─────────────────────────────────────────────────
const THUMBS_DIR = uploadDir("thumbnails");
fs.mkdirSync(THUMBS_DIR, { recursive: true });

// ── GET /api/files/trending (PUBLIC) ─────────────────────────────────────────
// Returns random active files from ALL users (for app home screen)
export async function getTrending(req, res, next) {
  try {
    const limit = Math.min(20, parseInt(req.query.limit) || 20);

    const [rows] = await pool.query(
      `SELECT f.id, f.original_name, f.mime_type, f.size_bytes, f.thumbnail_url,
              f.view_count, f.created_at, f.user_id AS creator_id, u.name AS creator_name
       FROM files f
       JOIN users u ON u.id = f.user_id
       WHERE f.status = 'active'
       ORDER BY RAND()
       LIMIT ?`,
      [limit]
    );

    // Cache for 2 minutes — reduces DB hits for trending feed
    res.setHeader("Cache-Control", "public, max-age=120");

    res.json({
      success: true,
      data: { files: rows, pagination: { page: 1, limit, total: rows.length, pages: 1 } },
    });
  } catch (err) {
    next(err);
  }
}

// ── GET /api/files/search (PUBLIC) ───────────────────────────────────────────
// Search active files by name, filter by type
export async function searchFiles(req, res, next) {
  try {
    const { q, type } = req.query;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, parseInt(req.query.limit) || 20);
    const offset = (page - 1) * limit;

    if (!q || q.trim().length < 2) {
      return res.json({ success: true, data: { files: [], pagination: { page, limit, total: 0, pages: 0 } } });
    }

    const searchTerm = `%${q.trim()}%`;
    let typeFilter = "";
    const params = [searchTerm, searchTerm];

    if (type === "video") { typeFilter = "AND f.mime_type LIKE 'video/%'"; }
    else if (type === "image") { typeFilter = "AND f.mime_type LIKE 'image/%'"; }
    else if (type === "audio") { typeFilter = "AND f.mime_type LIKE 'audio/%'"; }
    else if (type === "document") { typeFilter = "AND (f.mime_type LIKE 'application/%' OR f.mime_type LIKE 'text/%')"; }

    const [rows] = await pool.query(
      `SELECT f.id, f.original_name, f.mime_type, f.size_bytes, f.thumbnail_url,
              f.view_count, f.created_at, f.user_id AS creator_id, u.name AS creator_name
       FROM files f
       JOIN users u ON u.id = f.user_id
       WHERE f.status = 'active' ${typeFilter}
         AND (f.original_name LIKE ? OR u.name LIKE ?)
       ORDER BY f.view_count DESC, f.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total
       FROM files f
       JOIN users u ON u.id = f.user_id
       WHERE f.status = 'active' ${typeFilter}
         AND (f.original_name LIKE ? OR u.name LIKE ?)`,
      params
    );

    res.json({
      success: true,
      data: { files: rows, pagination: { page, limit, total: parseInt(total), pages: Math.ceil(total / limit) } },
    });
  } catch (err) {
    next(err);
  }
}

// ── GET /api/files ───────────────────────────────────────────────────────────
export async function listFiles(req, res, next) {
  try {
    const page   = Math.max(1, parseInt(req.query.page)  || 1);
    const limit  = Math.min(100, parseInt(req.query.limit) || 20);
    const offset = (page - 1) * limit;

    const [rows] = await pool.query(
      `SELECT id, original_name, mime_type, size_bytes, public_url, thumbnail_url,
              status, view_count, created_at
       FROM files
       WHERE user_id = ? AND status != 'deleted'
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [req.user.id, limit, offset]
    );

    const [[{ total }]] = await pool.query(
      "SELECT COUNT(*) AS total FROM files WHERE user_id = ? AND status != 'deleted'",
      [req.user.id]
    );

    res.json({
      success: true,
      data: { files: rows, pagination: { page, limit, total, pages: Math.ceil(total / limit) } },
    });
  } catch (err) {
    next(err);
  }
}

// ── GET /api/files/:id ───────────────────────────────────────────────────────
export async function getFile(req, res, next) {
  try {
    const [rows] = await pool.query(
      "SELECT * FROM files WHERE id = ? AND user_id = ? AND status != 'deleted'",
      [req.params.id, req.user.id]
    );

    if (!rows.length) {
      return res.status(404).json({ success: false, message: "File not found." });
    }

    res.json({ success: true, data: { file: rows[0] } });
  } catch (err) {
    next(err);
  }
}

// ── POST /api/files ──────────────────────────────────────────────────────────
// Removed: this legacy endpoint let clients register arbitrary stored_name /
// storage_path values (path traversal, audit finding F2) and is not used by
// any client. Files are created only by multipart upload, where the server
// generates the storage name.
export async function createFile(_req, res) {
  res.status(410).json({
    success: false,
    message: "Metadata-only file registration has been removed. Upload files with POST /api/files/upload.",
  });
}

// ── DELETE /api/files/:id ────────────────────────────────────────────────────
export async function deleteFile(req, res, next) {
  try {
    const [rows] = await pool.query(
      "SELECT id FROM files WHERE id = ? AND user_id = ?",
      [req.params.id, req.user.id]
    );

    if (!rows.length) {
      return res.status(404).json({ success: false, message: "File not found." });
    }

    // Soft delete
    await pool.query(
      "UPDATE files SET status = 'deleted' WHERE id = ?",
      [req.params.id]
    );

    res.json({ success: true, message: "File deleted." });
  } catch (err) {
    next(err);
  }
}

// ── POST /api/files/copy — copy a file from an active Vidora share link ──────
export async function copyFile(req, res, next) {
  try {
    const { file, shareToken, shareUrl } = await copySharedFile(req.user.id, req.body.url, { frontendUrl: config.frontendUrl });
    res.status(201).json({ success: true, message: "File copied to your account!", data: { file, share_url: shareUrl, share_token: shareToken } });
  } catch (err) {
    if (err instanceof CopyError) return res.status(err.status).json({ success: false, message: err.message });
    next(err);
  }
}

/**
 * Registers a file multer has already written under a server-generated name
 * (req.file.filename), generates a thumbnail for videos and hands the file to
 * the active storage provider. Shared by dashboard/app and Telegram uploads.
 */
async function storeUploadedFile(userId, uploaded) {
  const { originalname, mimetype, size, filename, path: filePath } = uploaded;
  const id = uuidv4();

  let thumbnailUrl = null;
  if (isVideo(mimetype)) {
    const thumbFilename = await generateThumbnail(filePath, THUMBS_DIR, filename.replace(/\.[^.]+$/, ""));
    if (thumbFilename) thumbnailUrl = `/thumbnails/${thumbFilename}`;
  }

  const { uploadToStorage } = await import("../utils/storage.js");
  let publicUrl = `${config.shareUrl}/uploads/${filename}`;
  try {
    const result = await uploadToStorage(filePath, filename);
    if (result.publicUrl) publicUrl = result.publicUrl;
  } catch (e) {
    // The file is already on local disk; keep serving it from there.
    console.warn("Storage upload fallback to local:", e.message);
  }

  const originalName = String(originalname || "file").slice(0, 255);
  await pool.query(
    `INSERT INTO files (id, user_id, original_name, stored_name, mime_type, size_bytes, storage_path, public_url, thumbnail_url, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
    [id, userId, originalName, filename, String(mimetype || "application/octet-stream").slice(0, 100), size, `uploads/${filename}`, publicUrl, thumbnailUrl]
  );

  const [rows] = await pool.query("SELECT * FROM files WHERE id = ?", [id]);
  notifySubscribers(userId, originalName, id, thumbnailUrl).catch(() => {});
  return rows[0];
}

// ── POST /api/files/upload ───────────────────────────────────────────────────
export async function uploadFile(req, res, next) {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: "No file provided." });
    const file = await storeUploadedFile(req.user.id, req.file);
    res.status(201).json({ success: true, message: "File uploaded.", data: { file } });
  } catch (err) {
    next(err);
  }
}

// ── POST /api/files/bot-upload ─ Telegram bot; req.user set by authenticateBotUser ──
export async function botUploadFile(req, res, next) {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: "No file provided." });
    const file = await storeUploadedFile(req.user.id, req.file);
    res.status(201).json({ success: true, message: "File uploaded via bot.", data: { file } });
  } catch (err) {
    next(err);
  }
}
// ── GET /api/files/:id/stats ─────────────────────────────────────────────────
export async function getFileStats(req, res, next) {
  try {
    const [rows] = await pool.query(
      `SELECT f.id, f.original_name, f.view_count,
              COALESCE(SUM(e.amount), 0) AS total_earnings
       FROM files f
       LEFT JOIN earnings e ON e.file_id = f.id
       WHERE f.id = ? AND f.user_id = ?
       GROUP BY f.id`,
      [req.params.id, req.user.id]
    );

    if (!rows.length) {
      return res.status(404).json({ success: false, message: "File not found." });
    }

    res.json({ success: true, data: rows[0] });
  } catch (err) {
    next(err);
  }
}

// ── Helper: Notify subscribers when creator uploads a new file ────────────────
async function notifySubscribers(creatorId, fileName, fileId, thumbnailUrl) {
  try {
    // Get creator name
    const [[creator]] = await pool.query("SELECT name FROM users WHERE id = ?", [creatorId]);
    if (!creator) return;

    // Get subscribers with notify=1 and their FCM tokens
    const [subscribers] = await pool.query(
      `SELECT DISTINCT u.fcm_token
       FROM subscriptions s
       JOIN users u ON u.id = s.subscriber_id
       WHERE s.creator_id = ? AND s.notify = 1 AND u.fcm_token IS NOT NULL AND u.is_active = 1`,
      [creatorId]
    );

    if (!subscribers.length) return;

    const tokens = subscribers.map(s => s.fcm_token).filter(Boolean);
    if (!tokens.length) return;

    // Send FCM push
    const { sendPushNotification } = await import("../utils/firebase.js");
    const title = `${creator.name} uploaded a new file`;
    const body = fileName.replace(/\.[^.]+$/, "");
    const thumbUrl = thumbnailUrl ? `${config.baseUrl}${thumbnailUrl}` : "";

    await sendPushNotification(tokens, title, body, {
      file_id: fileId,
      type: "new_upload",
      thumbnail: thumbUrl,
    });

    // Also create in-app notifications for subscribers
    const { randomUUID: uuidv4 } = await import("crypto");
    const [subs] = await pool.query(
      "SELECT subscriber_id FROM subscriptions WHERE creator_id = ? AND notify = 1",
      [creatorId]
    );
    for (const sub of subs) {
      await pool.query(
        "INSERT INTO notifications (id, user_id, title, message, type) VALUES (?, ?, ?, ?, ?)",
        [uuidv4(), sub.subscriber_id, title, body, "subscription"]
      );
    }
  } catch (err) {
    console.error("Subscriber notification error:", err.message);
  }
}

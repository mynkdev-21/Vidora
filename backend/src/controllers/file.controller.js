import { v4 as uuidv4 } from "uuid";
import path from "path";
import fs from "fs";
import pool from "../db/connection.js";
import { generateThumbnail, isVideo } from "../utils/thumbnail.js";

// ── Ensure directories exist ─────────────────────────────────────────────────
const UPLOADS_DIR = path.resolve("uploads");
const THUMBS_DIR = path.resolve("uploads/thumbnails");
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
if (!fs.existsSync(THUMBS_DIR)) fs.mkdirSync(THUMBS_DIR, { recursive: true });

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
// (Registers file metadata — actual upload handled separately via storage service)
export async function createFile(req, res, next) {
  try {
    const { original_name, stored_name, mime_type, size_bytes, storage_path, public_url } = req.body;

    const id = uuidv4();
    await pool.query(
      `INSERT INTO files (id, user_id, original_name, stored_name, mime_type, size_bytes, storage_path, public_url, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
      [id, req.user.id, original_name, stored_name, mime_type, size_bytes || 0, storage_path, public_url || null]
    );

    const [rows] = await pool.query("SELECT * FROM files WHERE id = ?", [id]);
    res.status(201).json({ success: true, message: "File registered.", data: { file: rows[0] } });
  } catch (err) {
    next(err);
  }
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

// ── POST /api/files/copy — Copy file from Vidora share link ───────────────────
export async function copyFile(req, res, next) {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ success: false, message: "URL required." });

    // Extract token from URL (supports full URL or just token)
    let token = url.trim();
    if (token.includes("/v/")) token = token.split("/v/")[1];
    if (token.includes("/")) token = token.split("/")[0];
    if (token.includes("?")) token = token.split("?")[0];

    // Find original file via share token or file ID
    let file = null;
    const [shareRows] = await pool.query(
      `SELECT f.* FROM share_tokens st JOIN files f ON f.id = st.file_id
       WHERE st.token = ? AND st.is_active = 1 AND f.status = 'active'`,
      [token]
    );
    if (shareRows.length) {
      file = shareRows[0];
    } else {
      const [fileRows] = await pool.query(
        "SELECT * FROM files WHERE id = ? AND status = 'active'",
        [token]
      );
      if (fileRows.length) file = fileRows[0];
    }

    if (!file) return res.status(404).json({ success: false, message: "File not found or link invalid." });

    // Don't allow copying own file
    if (file.user_id === req.user.id) {
      return res.status(400).json({ success: false, message: "This file is already in your account." });
    }

    // Create new DB entry (reference copy — same stored_name, no physical copy)
    const id = uuidv4();
    await pool.query(
      `INSERT INTO files (id, user_id, original_name, stored_name, mime_type, size_bytes, storage_path, public_url, thumbnail_url, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
      [id, req.user.id, file.original_name, file.stored_name, file.mime_type, file.size_bytes, file.storage_path, file.public_url, file.thumbnail_url]
    );

    // Generate share token for the new copy
    const crypto = await import("crypto");
    const shareToken = crypto.randomBytes(12).toString("base64url");
    await pool.query(
      "INSERT INTO share_tokens (id, file_id, token) VALUES (?, ?, ?)",
      [uuidv4(), id, shareToken]
    );

    const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:8080";
    const shareUrl = `${FRONTEND_URL}/v/${shareToken}`;

    const [newFile] = await pool.query("SELECT * FROM files WHERE id = ?", [id]);
    res.status(201).json({ success: true, message: "File copied to your account!", data: { file: newFile[0], share_url: shareUrl, share_token: shareToken } });
  } catch (err) {
    next(err);
  }
}

// Handles real multipart file upload via multer
export async function uploadFile(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file provided." });
    }

    const { originalname, mimetype, size, filename, path: filePath } = req.file;
    const id = uuidv4();
    const storagePath = `uploads/${filename}`;

    // Generate thumbnail for video files
    let thumbnailUrl = null;
    if (isVideo(mimetype)) {
      const videoFullPath = path.resolve(storagePath);
      const thumbFilename = await generateThumbnail(videoFullPath, THUMBS_DIR, filename.replace(/\.[^.]+$/, ""));
      if (thumbFilename) {
        thumbnailUrl = `/thumbnails/${thumbFilename}`;
      }
    }

    // Upload to active storage provider
    const { uploadToStorage } = await import("../utils/storage.js");
    let publicUrl = `${process.env.SHARE_URL || process.env.BASE_URL || "http://localhost:5001"}/uploads/${filename}`;
    try {
      const result = await uploadToStorage(path.resolve(storagePath), filename);
      if (result.publicUrl) publicUrl = result.publicUrl;
    } catch (e) {
      // Fallback: file is already on disk from multer, continue with local
      console.warn("Storage upload fallback to local:", e.message);
    }

    await pool.query(
      `INSERT INTO files (id, user_id, original_name, stored_name, mime_type, size_bytes, storage_path, public_url, thumbnail_url, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
      [id, req.user.id, originalname, filename, mimetype || "application/octet-stream", size, storagePath, publicUrl, thumbnailUrl]
    );

    const [rows] = await pool.query("SELECT * FROM files WHERE id = ?", [id]);
    res.status(201).json({ success: true, message: "File uploaded.", data: { file: rows[0] } });

    // Notify subscribers (non-blocking)
    notifySubscribers(req.user.id, originalname, id, thumbnailUrl).catch(() => {});
  } catch (err) {
    next(err);
  }
}
// ── POST /api/files/bot-upload ─ internal bot endpoint (no JWT, uses user API key) ──
export async function botUploadFile(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file provided." });
    }

    // Verify the user API key passed by the bot
    const userApiKey = req.headers["x-user-api-key"];
    const userId     = req.headers["x-bot-user-id"];

    if (!userApiKey || !userId) {
      return res.status(401).json({ success: false, message: "Missing bot auth headers." });
    }

    // Validate: api_key must belong to userId
    const [rows] = await pool.query(
      "SELECT user_id FROM user_api_keys WHERE api_key = ? AND user_id = ?",
      [userApiKey, userId]
    );
    if (!rows.length) {
      return res.status(403).json({ success: false, message: "Invalid user API key." });
    }

    const { originalname, mimetype, size, filename } = req.file;
    const id          = uuidv4();
    const storagePath = `uploads/${filename}`;

    // Generate thumbnail for video files
    let thumbnailUrl = null;
    if (isVideo(mimetype)) {
      const videoFullPath = path.resolve(storagePath);
      const thumbFilename = await generateThumbnail(videoFullPath, THUMBS_DIR, filename.replace(/\.[^.]+$/, ""));
      if (thumbFilename) {
        thumbnailUrl = `/thumbnails/${thumbFilename}`;
      }
    }

    // Upload to active storage provider
    const { uploadToStorage } = await import("../utils/storage.js");
    let publicUrl = `${process.env.SHARE_URL || process.env.BASE_URL || "http://localhost:5001"}/uploads/${filename}`;
    try {
      const result = await uploadToStorage(path.resolve(storagePath), filename);
      if (result.publicUrl) publicUrl = result.publicUrl;
    } catch (e) {
      console.warn("Storage upload fallback to local:", e.message);
    }

    await pool.query(
      `INSERT INTO files (id, user_id, original_name, stored_name, mime_type, size_bytes, storage_path, public_url, thumbnail_url, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
      [id, userId, originalname, filename, mimetype || "application/octet-stream", size, storagePath, publicUrl, thumbnailUrl]
    );

    const [fileRows] = await pool.query("SELECT * FROM files WHERE id = ?", [id]);
    res.status(201).json({ success: true, message: "File uploaded via bot.", data: { file: fileRows[0] } });

    // Notify subscribers (non-blocking)
    notifySubscribers(userId, originalname, id, thumbnailUrl).catch(() => {});
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
    const thumbUrl = thumbnailUrl ? `${process.env.BASE_URL || `http://localhost:${process.env.PORT || 5001}`}${thumbnailUrl}` : "";

    await sendPushNotification(tokens, title, body, {
      file_id: fileId,
      type: "new_upload",
      thumbnail: thumbUrl,
    });

    // Also create in-app notifications for subscribers
    const { v4: uuidv4 } = await import("uuid");
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

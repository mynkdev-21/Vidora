import { randomUUID as uuidv4 } from "crypto";
import crypto from "crypto";
import pool from "../db/connection.js";
import { sendStoredFile } from "../utils/media.js";

// Stream URLs are capabilities handed to the player; they must outlive a full
// playback session because every seek is a new Range request.
export const STREAM_TOKEN_TTL_SECONDS = 6 * 60 * 60;

// ── Generate a random short token ─────────────────────────────────────────────
function generateToken() {
  return crypto.randomBytes(12).toString("base64url"); // 16-char URL-safe token
}

// ── POST /api/share/:fileId/generate  (protected — creator only) ──────────────
// Creates or returns existing share token for a file
export async function generateShareLink(req, res, next) {
  try {
    const { fileId } = req.params;

    // Verify file belongs to this user
    const [files] = await pool.query(
      "SELECT id, original_name, mime_type, status FROM files WHERE id = ? AND user_id = ? AND status != 'deleted'",
      [fileId, req.user.id]
    );

    if (!files.length) {
      return res.status(404).json({ success: false, message: "File not found." });
    }

    // Check if active token already exists
    const [existing] = await pool.query(
      "SELECT token FROM share_tokens WHERE file_id = ? AND is_active = 1 LIMIT 1",
      [fileId]
    );

    if (existing.length) {
      return res.json({
        success: true,
        data: { token: existing[0].token, file: files[0] },
      });
    }

    // Create new token
    const token = generateToken();
    await pool.query(
      "INSERT INTO share_tokens (id, file_id, token) VALUES (?, ?, ?)",
      [uuidv4(), fileId, token]
    );

    res.status(201).json({
      success: true,
      data: { token, file: files[0] },
    });
  } catch (err) {
    next(err);
  }
}

// ── DELETE /api/share/:fileId/revoke  (protected) ─────────────────────────────
export async function revokeShareLink(req, res, next) {
  try {
    const { fileId } = req.params;

    // Verify ownership
    const [files] = await pool.query(
      "SELECT id FROM files WHERE id = ? AND user_id = ?",
      [fileId, req.user.id]
    );
    if (!files.length) {
      return res.status(404).json({ success: false, message: "File not found." });
    }

    await pool.query(
      "UPDATE share_tokens SET is_active = 0 WHERE file_id = ?",
      [fileId]
    );

    res.json({ success: true, message: "Share link revoked." });
  } catch (err) {
    next(err);
  }
}

// ── GET /api/share/view/:token  (PUBLIC — no auth needed) ─────────────────────
// Returns safe file metadata only — NEVER exposes storage_path or public_url
// Share link stays the same — only the internal video URL rotates per request
export async function viewSharedFile(req, res, next) {
  try {
    const { token } = req.params;

    // Validate token format (base64url, ~16 chars)
    if (!token || token.length < 5) {
      return res.status(400).json({ success: false, message: "Invalid token." });
    }

    let row = null;

    // Try as share token first
    const [shareRows] = await pool.query(
      `SELECT
         st.id AS share_id,
         st.file_id,
         f.view_count,
         f.original_name,
         f.mime_type,
         f.size_bytes,
         f.thumbnail_url,
         f.status,
         f.user_id,
         u.name AS creator_name
       FROM share_tokens st
       JOIN files f ON f.id = st.file_id
       JOIN users u ON u.id = f.user_id
       WHERE st.token = ? AND st.is_active = 1 AND f.status = 'active'`,
      [token]
    );

    if (shareRows.length) {
      row = shareRows[0];
    } else {
      // Try as file ID
      const [fileRows] = await pool.query(
        `SELECT
           f.id AS file_id,
           f.view_count,
           f.original_name,
           f.mime_type,
           f.size_bytes,
           f.thumbnail_url,
           f.status,
           f.user_id,
           u.name AS creator_name
         FROM files f
         JOIN users u ON u.id = f.user_id
         WHERE f.id = ? AND f.status = 'active'`,
        [token]
      );
      if (fileRows.length) row = fileRows[0];
    }

    if (!row) {
      return res.status(404).json({ success: false, message: "File not found." });
    }

    // NOTE: View count is NOT incremented from share page
    // Views will only be counted from the app (to be implemented later)

    // Return ONLY minimal metadata — no file IDs, no full names, no extensions
    res.json({
      success: true,
      data: {
        name:         row.original_name.replace(/\.[^.]+$/, ""),
        type:         row.mime_type.split("/")[0],
        size:         row.size_bytes,
        creator:      row.creator_name.split(" ")[0],
        creator_id:   row.user_id || null,
        views:        row.view_count,
        thumbnail:    row.thumbnail_url || null,
      },
    });
  } catch (err) {
    next(err);
  }
}

// ── GET /api/share/stream/:token  (PUBLIC — returns temporary signed video URL) ──
// This URL expires in 5 minutes — prevents URL extraction & view inflation
// Video is served directly with a temporary stream token
export async function getStreamUrl(req, res, next) {
  try {
    const { token } = req.params;

    if (!token || !/^[A-Za-z0-9_-]{10,30}$/.test(token)) {
      return res.status(400).json({ success: false, message: "Invalid token." });
    }

    // Token can be a share_token OR a file ID
    let fileRow = null;

    // Try share_token first
    const [shareRows] = await pool.query(
      `SELECT f.id, f.stored_name, f.mime_type
       FROM share_tokens st
       JOIN files f ON f.id = st.file_id
       WHERE st.token = ? AND st.is_active = 1 AND f.status = 'active'`,
      [token]
    );

    if (shareRows.length) {
      fileRow = shareRows[0];
    } else {
      // Try as file ID directly
      const [fileRows] = await pool.query(
        `SELECT id, stored_name, mime_type FROM files WHERE id = ? AND status = 'active'`,
        [token]
      );
      if (fileRows.length) fileRow = fileRows[0];
    }

    if (!fileRow) {
      return res.status(404).json({ success: false, message: "File not found." });
    }

    const streamToken = crypto.randomBytes(24).toString("hex");
    await pool.query(
      `INSERT INTO stream_tokens (id, file_id, token, expires_at) VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL ? SECOND))`,
      [uuidv4(), fileRow.id, streamToken, STREAM_TOKEN_TTL_SECONDS]
    );

    // Return direct video URL (not m3u8)
    res.json({
      success: true,
      data: {
        stream_url: `/api/stream/${streamToken}/video`,
        mime_type:   fileRow.mime_type || "video/mp4",
        expires_in:  STREAM_TOKEN_TTL_SECONDS,
      },
    });
  } catch (err) {
    next(err);
  }
}

// ── GET /api/stream/:streamToken/video  (no API key — the token is the capability) ──
// Serves the file behind a stream token from GET /api/share/stream/:token, with
// HTTP Range support so players can seek.
export async function serveStreamVideo(req, res, next) {
  try {
    const { streamToken } = req.params;
    if (!/^[0-9a-f]{48}$/.test(streamToken)) {
      return res.status(404).json({ success: false, message: "Stream not found." });
    }

    const [rows] = await pool.query(
      `SELECT f.id, f.stored_name, f.mime_type
       FROM stream_tokens st JOIN files f ON f.id = st.file_id
       WHERE st.token = ? AND st.expires_at > NOW() AND f.status = 'active'`,
      [streamToken]
    );
    if (!rows.length) {
      return res.status(410).json({ success: false, message: "Stream token expired." });
    }

    await sendStoredFile(req, res, rows[0]);
  } catch (err) {
    next(err);
  }
}

// ── GET /api/share/:fileId/token  (protected) ─────────────────────────────────
// Get existing token for a file (for dashboard display)
export async function getFileToken(req, res, next) {
  try {
    const { fileId } = req.params;

    const [files] = await pool.query(
      "SELECT id FROM files WHERE id = ? AND user_id = ? AND status != 'deleted'",
      [fileId, req.user.id]
    );
    if (!files.length) {
      return res.status(404).json({ success: false, message: "File not found." });
    }

    const [tokens] = await pool.query(
      "SELECT token, view_count, created_at FROM share_tokens WHERE file_id = ? AND is_active = 1 LIMIT 1",
      [fileId]
    );

    if (!tokens.length) {
      return res.json({ success: true, data: { token: null } });
    }

    res.json({ success: true, data: tokens[0] });
  } catch (err) {
    next(err);
  }
}

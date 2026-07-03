import { v4 as uuidv4 } from "uuid";
import crypto from "crypto";
import pool from "../db/connection.js";

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

    // Generate a one-time stream token (expires in 5 minutes)
    const streamToken = crypto.randomBytes(24).toString("hex");
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await pool.query(
      `INSERT INTO stream_tokens (id, file_id, token, expires_at) VALUES (?, ?, ?, ?)`,
      [uuidv4(), fileRow.id, streamToken, expiresAt]
    );

    // Return direct video URL (not m3u8)
    res.json({
      success: true,
      data: {
        stream_url: `/api/stream/${streamToken}/video`,
        mime_type:   fileRow.mime_type || "video/mp4",
        expires_in:  300,
      },
    });
  } catch (err) {
    next(err);
  }
}

// ── GET /api/stream/:streamToken/playlist.m3u8  (PUBLIC — serves HLS-like playlist) ──
// Validates stream token, serves video as single-segment m3u8
export async function servePlaylist(req, res, next) {
  try {
    const { streamToken } = req.params;

    // Validate & check expiry
    const [rows] = await pool.query(
      `SELECT st.file_id, st.expires_at, f.stored_name, f.mime_type
       FROM stream_tokens st
       JOIN files f ON f.id = st.file_id
       WHERE st.token = ? AND st.expires_at > NOW()`,
      [streamToken]
    );

    if (!rows.length) {
      return res.status(410).send("#EXTM3U\n#EXT-X-ERROR:Token expired or invalid\n#EXT-X-ENDLIST");
    }

    const file = rows[0];

    // Generate a segment token (valid 5 min, one-time use for the actual file)
    const segToken = crypto.randomBytes(20).toString("hex");
    const segExpires = new Date(Date.now() + 5 * 60 * 1000);

    await pool.query(
      `INSERT INTO stream_tokens (id, file_id, token, expires_at) VALUES (?, ?, ?, ?)`,
      [uuidv4(), file.file_id, segToken, segExpires]
    );

    // Serve m3u8 playlist pointing to segment endpoint
    const playlist = [
      "#EXTM3U",
      "#EXT-X-VERSION:3",
      "#EXT-X-TARGETDURATION:99999",
      "#EXT-X-MEDIA-SEQUENCE:0",
      "#EXTINF:99999.0,",
      `/api/stream/${segToken}/segment.ts`,
      "#EXT-X-ENDLIST",
    ].join("\n");

    res.setHeader("Content-Type", "application/vnd.apple.mpegurl");
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");
    res.setHeader("Pragma", "no-cache");
    res.send(playlist);
  } catch (err) {
    next(err);
  }
}

// ── GET /api/stream/:streamToken/segment.ts  (PUBLIC — serves actual video bytes) ──
// One-time use token — after serving, token is invalidated
export async function serveSegment(req, res, next) {
  try {
    const { streamToken } = req.params;

    const [rows] = await pool.query(
      `SELECT st.id AS token_id, st.file_id, f.stored_name, f.mime_type, f.original_name
       FROM stream_tokens st
       JOIN files f ON f.id = st.file_id
       WHERE st.token = ? AND st.expires_at > NOW()`,
      [streamToken]
    );

    if (!rows.length) {
      return res.status(410).json({ success: false, message: "Stream token expired." });
    }

    const file = rows[0];

    // Invalidate token after use (one-time)
    pool.query("DELETE FROM stream_tokens WHERE id = ?", [file.token_id]).catch(() => {});

    // Serve file
    const fs = await import("fs");
    const path = await import("path");
    const fullPath = path.default.resolve(`uploads/${file.stored_name}`);

    if (!fs.default.existsSync(fullPath)) {
      return res.status(404).json({ success: false, message: "File not found on disk." });
    }

    const stat = fs.default.statSync(fullPath);
    res.setHeader("Content-Type", file.mime_type || "video/mp4");
    res.setHeader("Content-Length", stat.size);
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");
    res.setHeader("X-Content-Type-Options", "nosniff");

    const stream = fs.default.createReadStream(fullPath);
    stream.pipe(res);
  } catch (err) {
    next(err);
  }
}

// ── GET /api/share/media/:fileId  (LEGACY — signed URL approach, kept for compatibility) ──
export async function serveMedia(req, res, next) {
  try {
    const { fileId } = req.params;
    const { expires, sig } = req.query;

    if (!expires || !sig) {
      return res.status(403).json({ success: false, message: "Access denied. Missing signature." });
    }

    const expiresAt = parseInt(expires, 10);
    if (isNaN(expiresAt) || Date.now() > expiresAt) {
      return res.status(410).json({ success: false, message: "Link expired." });
    }

    const payload = `${fileId}:${expiresAt}`;
    const expectedSig = crypto
      .createHmac("sha256", process.env.JWT_SECRET || "secret")
      .update(payload)
      .digest("hex")
      .slice(0, 24);

    if (sig !== expectedSig) {
      return res.status(403).json({ success: false, message: "Invalid signature." });
    }

    const [rows] = await pool.query(
      "SELECT stored_name, mime_type, original_name FROM files WHERE id = ? AND status = 'active'",
      [fileId]
    );

    if (!rows.length) {
      return res.status(404).json({ success: false, message: "File not found." });
    }

    const file = rows[0];
    const fs = await import("fs");
    const path = await import("path");
    const fullPath = path.default.resolve(`uploads/${file.stored_name}`);

    if (!fs.default.existsSync(fullPath)) {
      return res.status(404).json({ success: false, message: "File not found on disk." });
    }

    const stat = fs.default.statSync(fullPath);
    res.setHeader("Content-Type", file.mime_type);
    res.setHeader("Content-Length", stat.size);
    res.setHeader("Cache-Control", "no-store, private");
    res.setHeader("Content-Disposition", `inline; filename="${file.original_name}"`);

    fs.default.createReadStream(fullPath).pipe(res);
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

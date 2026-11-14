/**
 * Copying a file into another user's account (audit finding F8).
 *
 * Rules:
 *   - only through an ACTIVE share link the owner created (never by raw file
 *     ID, which the public feed exposes for every file);
 *   - you can't copy your own file (or a copy of it);
 *   - the copy points at the same stored object (no duplicate bytes) and
 *     remembers its origin: views on the copy pay the ORIGINAL uploader.
 * Used by POST /api/files/copy and the Telegram bot's /copy command.
 */
import crypto from "crypto";
import pool from "../db/connection.js";

export class CopyError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

/** Accepts a share URL (".../v/<token>?x") or a bare token. */
export function extractShareToken(input) {
  let token = String(input || "").trim();
  if (token.includes("/v/")) token = token.split("/v/")[1];
  token = token.split(/[/?#]/)[0];
  return /^[A-Za-z0-9_-]{8,32}$/.test(token) ? token : null;
}

export async function copySharedFile(userId, shareInput, { frontendUrl }) {
  const token = extractShareToken(shareInput);
  if (!token) throw new CopyError("File not found or link invalid.", 404);

  const [rows] = await pool.query(
    `SELECT f.* FROM share_tokens st JOIN files f ON f.id = st.file_id
     WHERE st.token = ? AND st.is_active = 1 AND f.status = 'active'`,
    [token]
  );
  const file = rows[0];
  if (!file) throw new CopyError("File not found or link invalid.", 404);

  const payeeUserId = file.payee_user_id || file.user_id;
  if (file.user_id === userId || payeeUserId === userId) {
    throw new CopyError("This file is already in your account.", 400);
  }

  const id = crypto.randomUUID();
  const shareToken = crypto.randomBytes(12).toString("base64url");
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query(
      `INSERT INTO files (id, user_id, source_file_id, payee_user_id, original_name, stored_name, mime_type,
                          size_bytes, storage_path, public_url, thumbnail_url, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
      [id, userId, file.source_file_id || file.id, payeeUserId, file.original_name, file.stored_name,
        file.mime_type, file.size_bytes, file.storage_path, file.public_url, file.thumbnail_url]
    );
    await conn.query("INSERT INTO share_tokens (id, file_id, token) VALUES (?, ?, ?)", [crypto.randomUUID(), id, shareToken]);
    await conn.commit();
  } catch (err) {
    await conn.rollback().catch(() => {});
    throw err;
  } finally {
    conn.release();
  }

  const [[copy]] = await pool.query("SELECT * FROM files WHERE id = ?", [id]);
  return { file: copy, shareToken, shareUrl: `${frontendUrl}/v/${shareToken}` };
}

import pool from "../db/connection.js";

// payee_user_id: who earns from views — the original uploader for copies.
const FILE_COLUMNS = "f.id, f.user_id, COALESCE(f.payee_user_id, f.user_id) AS payee_user_id, f.stored_name, f.mime_type, f.original_name";

/**
 * Resolves a public reference — a file ID or an active share token — to an
 * active file. Returns { file, shareToken } or null. shareToken is set only
 * when the reference was a share token.
 */
export async function findActiveFile(ref, conn = pool) {
  if (typeof ref !== "string" || !ref || ref.length > 64) return null;

  const [byId] = await conn.query(
    `SELECT ${FILE_COLUMNS} FROM files f WHERE f.id = ? AND f.status = 'active'`,
    [ref]
  );
  if (byId.length) return { file: byId[0], shareToken: null };

  const [byToken] = await conn.query(
    `SELECT ${FILE_COLUMNS}
     FROM share_tokens st JOIN files f ON f.id = st.file_id
     WHERE st.token = ? AND st.is_active = 1 AND f.status = 'active'`,
    [ref]
  );
  return byToken.length ? { file: byToken[0], shareToken: ref } : null;
}

import pool from "../db/connection.js";

/**
 * Authenticates Telegram-bot uploads with the uploader's personal API key
 * (X-User-Api-Key) bound to their user ID (X-Bot-User-Id). Runs before any
 * body parsing so rejected requests never touch the disk.
 */
export async function authenticateBotUser(req, res, next) {
  try {
    const userApiKey = req.get("x-user-api-key");
    const userId = req.get("x-bot-user-id");
    if (!userApiKey || !userId) {
      return res.status(401).json({ success: false, message: "Missing bot auth headers." });
    }

    const [rows] = await pool.query(
      `SELECT k.user_id, u.email, u.role
       FROM user_api_keys k JOIN users u ON u.id = k.user_id
       WHERE k.api_key = ? AND k.user_id = ? AND u.is_active = 1`,
      [userApiKey, userId]
    );
    if (!rows.length) {
      return res.status(403).json({ success: false, message: "Invalid user API key." });
    }

    req.user = { id: rows[0].user_id, email: rows[0].email, role: rows[0].role };
    next();
  } catch (err) {
    next(err);
  }
}

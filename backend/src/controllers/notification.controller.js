import pool from "../db/connection.js";

// ── GET /api/notifications — Get user's notifications ────────────────────────
export async function getNotifications(req, res, next) {
  try {
    const [rows] = await pool.query(
      "SELECT id, title, message, type, is_read, created_at FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50",
      [req.user.id]
    );

    const [[{ unread }]] = await pool.query(
      "SELECT COUNT(*) AS unread FROM notifications WHERE user_id = ? AND is_read = 0",
      [req.user.id]
    );

    res.json({ success: true, data: { notifications: rows, unread: parseInt(unread) } });
  } catch (err) { next(err); }
}

// ── PATCH /api/notifications/read-all — Mark all as read ─────────────────────
export async function markAllRead(req, res, next) {
  try {
    await pool.query("UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0", [req.user.id]);
    res.json({ success: true, message: "All notifications marked as read." });
  } catch (err) { next(err); }
}

// ── PATCH /api/notifications/:id/read — Mark one as read ─────────────────────
export async function markRead(req, res, next) {
  try {
    await pool.query("UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?", [req.params.id, req.user.id]);
    res.json({ success: true });
  } catch (err) { next(err); }
}

import { v4 as uuidv4 } from "uuid";
import pool from "../db/connection.js";

// ── POST /api/subscribe/:creatorId — Subscribe to a creator ───────────────────
export async function subscribe(req, res, next) {
  try {
    const { creatorId } = req.params;
    const subscriberId = req.user.id;

    if (subscriberId === creatorId) {
      return res.status(400).json({ success: false, message: "Cannot subscribe to yourself." });
    }

    // Check creator exists
    const [users] = await pool.query("SELECT id FROM users WHERE id = ? AND is_active = 1", [creatorId]);
    if (!users.length) return res.status(404).json({ success: false, message: "Creator not found." });

    // Upsert subscription
    const id = uuidv4();
    await pool.query(
      `INSERT INTO subscriptions (id, subscriber_id, creator_id) VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE created_at = created_at`,
      [id, subscriberId, creatorId]
    );

    res.json({ success: true, message: "Subscribed!" });
  } catch (err) { next(err); }
}

// ── DELETE /api/subscribe/:creatorId — Unsubscribe ────────────────────────────
export async function unsubscribe(req, res, next) {
  try {
    const { creatorId } = req.params;
    await pool.query(
      "DELETE FROM subscriptions WHERE subscriber_id = ? AND creator_id = ?",
      [req.user.id, creatorId]
    );
    res.json({ success: true, message: "Unsubscribed." });
  } catch (err) { next(err); }
}

// ── PATCH /api/subscribe/:creatorId/bell — Toggle bell notification ───────────
export async function toggleBell(req, res, next) {
  try {
    const { creatorId } = req.params;
    const { notify } = req.body; // true/false
    await pool.query(
      "UPDATE subscriptions SET notify = ? WHERE subscriber_id = ? AND creator_id = ?",
      [notify ? 1 : 0, req.user.id, creatorId]
    );
    res.json({ success: true, message: notify ? "Notifications ON" : "Notifications OFF" });
  } catch (err) { next(err); }
}

// ── GET /api/subscribe/status/:creatorId — Check if subscribed ────────────────
export async function getSubscriptionStatus(req, res, next) {
  try {
    const { creatorId } = req.params;
    const [rows] = await pool.query(
      "SELECT notify FROM subscriptions WHERE subscriber_id = ? AND creator_id = ?",
      [req.user.id, creatorId]
    );
    res.json({
      success: true,
      data: {
        subscribed: rows.length > 0,
        notify: rows.length > 0 ? rows[0].notify === 1 : false,
      },
    });
  } catch (err) { next(err); }
}

// ── GET /api/subscribe/feed — Subscribed creators' latest files ───────────────
export async function getFeed(req, res, next) {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, parseInt(req.query.limit) || 20);
    const offset = (page - 1) * limit;

    const [rows] = await pool.query(
      `SELECT f.id, f.original_name, f.mime_type, f.size_bytes, f.thumbnail_url,
              f.view_count, f.created_at, u.id AS creator_id, u.name AS creator_name
       FROM files f
       JOIN users u ON u.id = f.user_id
       JOIN subscriptions s ON s.creator_id = f.user_id AND s.subscriber_id = ?
       WHERE f.status = 'active'
       ORDER BY f.created_at DESC
       LIMIT ? OFFSET ?`,
      [req.user.id, limit, offset]
    );

    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total
       FROM files f
       JOIN subscriptions s ON s.creator_id = f.user_id AND s.subscriber_id = ?
       WHERE f.status = 'active'`,
      [req.user.id]
    );

    // Cache feed for 60 seconds (private — user-specific)
    res.setHeader("Cache-Control", "private, max-age=60");

    res.json({
      success: true,
      data: { files: rows, pagination: { page, limit, total: parseInt(total), pages: Math.ceil(total / limit) } },
    });
  } catch (err) { next(err); }
}

// ── GET /api/subscribe/list — List subscribed creators ────────────────────────
export async function getSubscriptions(req, res, next) {
  try {
    const [rows] = await pool.query(
      `SELECT u.id, u.name, u.avatar_url, s.notify, s.created_at AS subscribed_at,
              (SELECT COUNT(*) FROM files WHERE user_id = u.id AND status = 'active') AS file_count,
              (SELECT COALESCE(SUM(view_count),0) FROM files WHERE user_id = u.id AND status = 'active') AS total_views
       FROM subscriptions s
       JOIN users u ON u.id = s.creator_id
       WHERE s.subscriber_id = ?
       ORDER BY s.created_at DESC`,
      [req.user.id]
    );
    res.json({ success: true, data: { subscriptions: rows } });
  } catch (err) { next(err); }
}

// ── GET /api/creators/:id — Creator public profile ────────────────────────────
export async function getCreatorProfile(req, res, next) {
  try {
    const { id } = req.params;
    const [rows] = await pool.query(
      `SELECT u.id, u.name, u.avatar_url, u.created_at,
              (SELECT COUNT(*) FROM files WHERE user_id = u.id AND status = 'active') AS file_count,
              (SELECT COALESCE(SUM(view_count),0) FROM files WHERE user_id = u.id AND status = 'active') AS total_views,
              (SELECT COUNT(*) FROM subscriptions WHERE creator_id = u.id) AS subscriber_count
       FROM users u
       WHERE u.id = ? AND u.is_active = 1`,
      [id]
    );

    if (!rows.length) return res.status(404).json({ success: false, message: "Creator not found." });

    res.json({ success: true, data: { creator: rows[0] } });
  } catch (err) { next(err); }
}

// ── GET /api/creators/:id/files — Creator's public files (paginated) ──────────
export async function getCreatorFiles(req, res, next) {
  try {
    const { id } = req.params;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, parseInt(req.query.limit) || 20);
    const offset = (page - 1) * limit;
    const sort = req.query.sort === "popular" ? "view_count DESC" : "created_at DESC";

    const [rows] = await pool.query(
      `SELECT id, original_name, mime_type, size_bytes, thumbnail_url, view_count, created_at
       FROM files
       WHERE user_id = ? AND status = 'active'
       ORDER BY ${sort}
       LIMIT ? OFFSET ?`,
      [id, limit, offset]
    );

    const [[{ total }]] = await pool.query(
      "SELECT COUNT(*) AS total FROM files WHERE user_id = ? AND status = 'active'",
      [id]
    );

    res.json({
      success: true,
      data: { files: rows, pagination: { page, limit, total: parseInt(total), pages: Math.ceil(total / limit) } },
    });
  } catch (err) { next(err); }
}

import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import crypto from "crypto";
import pool from "../db/connection.js";

// ── helpers ───────────────────────────────────────────────────────────────────
function generateUserApiKey() {
  return "vdr_user_" + crypto.randomBytes(24).toString("hex");
}

// ── GET /api/users/profile ───────────────────────────────────────────────────
export async function getProfile(req, res, next) {
  try {
    const [rows] = await pool.query(
      `SELECT id, name, email, role, is_verified, is_premium, avatar_url, purged_views, created_at,
              (SELECT COALESCE(SUM(view_count),0) FROM files WHERE user_id = u.id) AS total_views,
              (SELECT COUNT(*) FROM files WHERE user_id = u.id AND status = 'active') AS total_files,
              (SELECT COUNT(*) FROM subscriptions WHERE creator_id = u.id) AS subscriber_count,
              (SELECT COALESCE(SUM(size_bytes),0) FROM files WHERE user_id = u.id AND status = 'active') AS storage_used,
              (SELECT COALESCE(SUM(CASE WHEN mime_type LIKE 'video/%' THEN size_bytes ELSE 0 END),0) FROM files WHERE user_id = u.id AND status = 'active') AS storage_videos,
              (SELECT COALESCE(SUM(CASE WHEN mime_type LIKE 'image/%' THEN size_bytes ELSE 0 END),0) FROM files WHERE user_id = u.id AND status = 'active') AS storage_images,
              (SELECT COALESCE(SUM(CASE WHEN mime_type LIKE 'application/%' THEN size_bytes ELSE 0 END),0) FROM files WHERE user_id = u.id AND status = 'active') AS storage_documents,
              (SELECT COALESCE(SUM(CASE WHEN mime_type NOT LIKE 'video/%' AND mime_type NOT LIKE 'image/%' AND mime_type NOT LIKE 'application/%' THEN size_bytes ELSE 0 END),0) FROM files WHERE user_id = u.id AND status = 'active') AS storage_other
       FROM users u WHERE u.id = ?`,
      [req.user.id]
    );

    if (!rows.length) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    const user = rows[0];
    // Ensure numeric types
    user.total_views = (parseInt(user.total_views) || 0) + (parseInt(user.purged_views) || 0);
    user.total_files = parseInt(user.total_files) || 0;
    user.subscriber_count = parseInt(user.subscriber_count) || 0;
    user.storage_used = parseInt(user.storage_used) || 0;
    user.storage_videos = parseInt(user.storage_videos) || 0;
    user.storage_images = parseInt(user.storage_images) || 0;
    user.storage_documents = parseInt(user.storage_documents) || 0;
    user.storage_other = parseInt(user.storage_other) || 0;
    // Calculate earnings from views: dynamic rate from settings
    let earningRate = 5.0;
    try {
      const [[rateSetting]] = await pool.query("SELECT value FROM app_settings WHERE id = 'earning_rate'");
      if (rateSetting) earningRate = parseFloat(rateSetting.value);
    } catch {}

    // Earnings from existing files + purged files (saved in earnings table)
    const fromActiveViews = parseFloat((user.total_views * earningRate / 1000).toFixed(4));
    let fromPurged = 0;
    try {
      const [[purgedData]] = await pool.query(
        "SELECT COALESCE(SUM(amount), 0) AS total FROM earnings WHERE user_id = ? AND type = 'view'",
        [req.user.id]
      );
      fromPurged = parseFloat(purgedData.total) || 0;
    } catch {}
    user.total_earnings = parseFloat((fromActiveViews + fromPurged).toFixed(4));

    res.json({ success: true, data: { user } });
  } catch (err) {
    next(err);
  }
}

// ── PATCH /api/users/profile ─────────────────────────────────────────────────
export async function updateProfile(req, res, next) {
  try {
    const { name, avatar_url } = req.body;

    // Explicit whitelist — never interpolate user-supplied column names
    const updates = [];
    const values  = [];

    if (name !== undefined)       { updates.push("name = ?");       values.push(name.trim()); }
    if (avatar_url !== undefined) { updates.push("avatar_url = ?"); values.push(avatar_url); }

    if (!updates.length) {
      return res.status(400).json({ success: false, message: "No fields to update." });
    }

    // user id comes from verified JWT — never from request body
    values.push(req.user.id);
    await pool.query(
      `UPDATE users SET ${updates.join(", ")} WHERE id = ?`,
      values
    );

    res.json({ success: true, message: "Profile updated." });
  } catch (err) {
    next(err);
  }
}

// ── PATCH /api/users/change-password ────────────────────────────────────────
export async function changePassword(req, res, next) {
  try {
    const { currentPassword, newPassword } = req.body;

    const [rows] = await pool.query(
      "SELECT password_hash FROM users WHERE id = ?",
      [req.user.id]
    );

    const match = await bcrypt.compare(currentPassword, rows[0].password_hash);
    if (!match) {
      return res.status(401).json({ success: false, message: "Current password is incorrect." });
    }

    const newHash = await bcrypt.hash(newPassword, 12);
    await pool.query("UPDATE users SET password_hash = ? WHERE id = ?", [newHash, req.user.id]);

    // Invalidate all refresh tokens (force re-login on other devices)
    await pool.query("DELETE FROM refresh_tokens WHERE user_id = ?", [req.user.id]);

    res.json({ success: true, message: "Password changed. Please log in again on other devices." });
  } catch (err) {
    next(err);
  }
}

// ── GET /api/users (admin only) ──────────────────────────────────────────────
export async function listUsers(req, res, next) {
  try {
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 20);
    const offset = (page - 1) * limit;

    const [rows]  = await pool.query(
      "SELECT id, name, email, role, is_active, is_verified, created_at FROM users ORDER BY created_at DESC LIMIT ? OFFSET ?",
      [limit, offset]
    );
    const [[{ total }]] = await pool.query("SELECT COUNT(*) AS total FROM users");

    res.json({
      success: true,
      data: { users: rows, pagination: { page, limit, total, pages: Math.ceil(total / limit) } },
    });
  } catch (err) {
    next(err);
  }
}

// ── GET /api/users/api-key ────────────────────────────────────────────────────
// Returns existing key or auto-creates one on first call — permanent, no regeneration
export async function getApiKey(req, res, next) {
  try {
    const [rows] = await pool.query(
      "SELECT api_key, created_at FROM user_api_keys WHERE user_id = ?",
      [req.user.id]
    );

    if (rows.length) {
      return res.json({ success: true, data: { api_key: rows[0].api_key, created_at: rows[0].created_at } });
    }

    // Auto-generate once — never changes after this
    const newKey = generateUserApiKey();
    const id     = uuidv4();
    await pool.query(
      "INSERT INTO user_api_keys (id, user_id, api_key) VALUES (?, ?, ?)",
      [id, req.user.id, newKey]
    );

    res.status(201).json({ success: true, data: { api_key: newKey, created_at: new Date() } });
  } catch (err) {
    next(err);
  }
}

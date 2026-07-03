import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import pool from "../db/connection.js";

const SALT_ROUNDS = 12;

function signAdminToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "24h" });
}

// ── POST /api/admin/auth/login ───────────────────────────────────────────────
export async function adminLogin(req, res, next) {
  try {
    const { email, password } = req.body;

    const [rows] = await pool.query(
      "SELECT id, name, email, password_hash, is_active FROM admins WHERE email = ?",
      [email.toLowerCase().trim()]
    );

    if (!rows.length) {
      return res.status(401).json({ success: false, message: "Invalid email or password." });
    }

    const admin = rows[0];

    if (!admin.is_active) {
      return res.status(403).json({ success: false, message: "Account has been deactivated." });
    }

    const passwordMatch = await bcrypt.compare(password, admin.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({ success: false, message: "Invalid email or password." });
    }

    // Update last login
    await pool.query("UPDATE admins SET last_login = NOW() WHERE id = ?", [admin.id]);

    const token = signAdminToken({ id: admin.id, email: admin.email, role: "admin" });

    res.json({
      success: true,
      message: "Admin login successful.",
      data: {
        admin: { id: admin.id, name: admin.name, email: admin.email },
        token,
      },
    });
  } catch (err) {
    next(err);
  }
}

// ── GET /api/admin/auth/me ───────────────────────────────────────────────────
export async function adminMe(req, res, next) {
  try {
    const [rows] = await pool.query(
      "SELECT id, name, email, created_at, last_login FROM admins WHERE id = ?",
      [req.admin.id]
    );

    if (!rows.length) {
      return res.status(404).json({ success: false, message: "Admin not found." });
    }

    res.json({ success: true, data: { admin: rows[0] } });
  } catch (err) {
    next(err);
  }
}


// ── PATCH /api/admin/auth/update — Update admin email/password ────────────────
export async function adminUpdate(req, res, next) {
  try {
    const { email, currentPassword, newPassword } = req.body;
    const pool = (await import("../db/connection.js")).default;
    const bcrypt = (await import("bcryptjs")).default;

    const [[admin]] = await pool.query("SELECT id, password_hash, email FROM admins WHERE id = ?", [req.admin.id]);
    if (!admin) return res.status(404).json({ success: false, message: "Admin not found." });

    // If changing password, verify current
    if (newPassword) {
      if (!currentPassword) return res.status(400).json({ success: false, message: "Current password required." });
      const match = await bcrypt.compare(currentPassword, admin.password_hash);
      if (!match) return res.status(401).json({ success: false, message: "Current password is incorrect." });
      const newHash = await bcrypt.hash(newPassword, 12);
      await pool.query("UPDATE admins SET password_hash = ? WHERE id = ?", [newHash, req.admin.id]);
    }

    // If changing email
    if (email && email !== admin.email) {
      await pool.query("UPDATE admins SET email = ? WHERE id = ?", [email.toLowerCase().trim(), req.admin.id]);
    }

    res.json({ success: true, message: "Admin profile updated." });
  } catch (err) { next(err); }
}

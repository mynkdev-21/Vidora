import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { randomUUID as uuidv4 } from "crypto";
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

    const normalizedEmail = typeof email === "string" ? email.toLowerCase().trim() : "";
    const changingEmail = !!normalizedEmail && normalizedEmail !== admin.email;
    if (!newPassword && !changingEmail) {
      return res.status(400).json({ success: false, message: "Nothing to update." });
    }

    // Any credential change requires the current password (a stolen session alone is not enough).
    if (!currentPassword) return res.status(400).json({ success: false, message: "Current password required." });
    const match = await bcrypt.compare(currentPassword, admin.password_hash);
    if (!match) return res.status(401).json({ success: false, message: "Current password is incorrect." });

    if (changingEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return res.status(400).json({ success: false, message: "Valid email required." });
    }
    if (newPassword && String(newPassword).length < 10) {
      return res.status(400).json({ success: false, message: "New admin password must be at least 10 characters." });
    }

    if (newPassword) {
      const newHash = await bcrypt.hash(newPassword, 12);
      await pool.query("UPDATE admins SET password_hash = ? WHERE id = ?", [newHash, req.admin.id]);
    }
    if (changingEmail) {
      await pool.query("UPDATE admins SET email = ? WHERE id = ?", [normalizedEmail, req.admin.id]);
    }

    res.json({ success: true, message: "Admin profile updated." });
  } catch (err) { next(err); }
}

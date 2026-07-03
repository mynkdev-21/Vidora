import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import pool from "../db/connection.js";

const SALT_ROUNDS = 12;

function signAccessToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
}

function signRefreshToken(payload) {
  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "30d",
  });
}

// ── POST /api/auth/register ──────────────────────────────────────────────────
export async function register(req, res, next) {
  try {
    const { name, email, password, referral_code } = req.body;

    // Check duplicate email
    const [existing] = await pool.query(
      "SELECT id FROM users WHERE email = ?",
      [email.toLowerCase().trim()]
    );
    if (existing.length) {
      return res.status(409).json({ success: false, message: "Email already registered." });
    }

    const id           = uuidv4();
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    // Check if referral code (user ID) is valid
    let referrerId = null;
    if (referral_code) {
      const [refUser] = await pool.query("SELECT id FROM users WHERE id = ?", [referral_code]);
      if (refUser.length) referrerId = refUser[0].id;
    }

    await pool.query(
      "INSERT INTO users (id, name, email, password_hash, referred_by) VALUES (?, ?, ?, ?, ?)",
      [id, name.trim(), email.toLowerCase().trim(), passwordHash, referrerId]
    );

    const tokenPayload = { id, email: email.toLowerCase().trim(), role: "creator" };
    const accessToken  = signAccessToken(tokenPayload);
    const refreshToken = signRefreshToken(tokenPayload);

    // Store hashed refresh token
    const refreshHash = await bcrypt.hash(refreshToken, 8);
    const expiresAt   = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await pool.query(
      "INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, ?)",
      [uuidv4(), id, refreshHash, expiresAt]
    );

    // Send welcome + verification email (non-blocking)
    import("../utils/mailer.js").then(async ({ sendEmail, verificationEmail }) => {
      const crypto = await import("crypto");
      const verifyToken = crypto.randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
      await pool.query(
        "INSERT INTO email_verifications (id, user_id, token, expires_at) VALUES (?, ?, ?, ?)",
        [uuidv4(), id, verifyToken, expiresAt]
      );
      const verifyUrl = `${process.env.FRONTEND_URL || "http://localhost:8080"}/verify-email?token=${verifyToken}`;
      sendEmail(email.toLowerCase().trim(), "Vidora — Verify Your Email", verificationEmail(name.trim(), verifyUrl));
    }).catch(() => {});

    res.status(201).json({
      success: true,
      message: "Account created successfully.",
      data: {
        user:         { id, name: name.trim(), email: email.toLowerCase().trim(), role: "creator" },
        accessToken,
        refreshToken,
      },
    });
  } catch (err) {
    next(err);
  }
}

// ── POST /api/auth/login ─────────────────────────────────────────────────────
export async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    const [rows] = await pool.query(
      "SELECT id, name, email, password_hash, role, is_active, avatar_url FROM users WHERE email = ?",
      [email.toLowerCase().trim()]
    );

    if (!rows.length) {
      return res.status(401).json({ success: false, message: "Invalid email or password." });
    }

    const user = rows[0];

    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        message: "Your account has been banned. Please contact support.",
        code: "ACCOUNT_BANNED",
        support_url: "https://t.me/vidorasupport",
      });
    }

    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({ success: false, message: "Invalid email or password." });
    }

    const tokenPayload = { id: user.id, email: user.email, role: user.role };
    const accessToken  = signAccessToken(tokenPayload);
    const refreshToken = signRefreshToken(tokenPayload);

    // Store hashed refresh token
    const refreshHash = await bcrypt.hash(refreshToken, 8);
    const expiresAt   = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await pool.query(
      "INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, ?)",
      [uuidv4(), user.id, refreshHash, expiresAt]
    );

    res.json({
      success: true,
      message: "Login successful.",
      data: {
        user:         { id: user.id, name: user.name, email: user.email, role: user.role, avatar_url: user.avatar_url || null },
        accessToken,
        refreshToken,
      },
    });
  } catch (err) {
    next(err);
  }
}

// ── POST /api/auth/refresh ───────────────────────────────────────────────────
export async function refresh(req, res, next) {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ success: false, message: "Refresh token required." });
    }

    let decoded;
    try {
      decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    } catch {
      return res.status(401).json({ success: false, message: "Invalid or expired refresh token." });
    }

    // Find matching stored token
    const [tokens] = await pool.query(
      "SELECT id, token_hash FROM refresh_tokens WHERE user_id = ? AND expires_at > NOW()",
      [decoded.id]
    );

    let matched = null;
    for (const t of tokens) {
      if (await bcrypt.compare(refreshToken, t.token_hash)) {
        matched = t;
        break;
      }
    }

    if (!matched) {
      return res.status(401).json({ success: false, message: "Refresh token not recognised." });
    }

    // Rotate — delete old, issue new
    await pool.query("DELETE FROM refresh_tokens WHERE id = ?", [matched.id]);

    const [userRows] = await pool.query(
      "SELECT id, email, role FROM users WHERE id = ? AND is_active = 1",
      [decoded.id]
    );
    if (!userRows.length) {
      return res.status(401).json({ success: false, message: "User not found." });
    }

    const tokenPayload    = { id: userRows[0].id, email: userRows[0].email, role: userRows[0].role };
    const newAccessToken  = signAccessToken(tokenPayload);
    const newRefreshToken = signRefreshToken(tokenPayload);

    const newHash   = await bcrypt.hash(newRefreshToken, 8);
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await pool.query(
      "INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, ?)",
      [uuidv4(), userRows[0].id, newHash, expiresAt]
    );

    res.json({
      success: true,
      data: { accessToken: newAccessToken, refreshToken: newRefreshToken },
    });
  } catch (err) {
    next(err);
  }
}

// ── POST /api/auth/logout ────────────────────────────────────────────────────
export async function logout(req, res, next) {
  try {
    const { refreshToken } = req.body;

    if (refreshToken) {
      // Verify before trusting — never use jwt.decode() for security decisions
      try {
        const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
        if (decoded?.id) {
          await pool.query("DELETE FROM refresh_tokens WHERE user_id = ?", [decoded.id]);
        }
      } catch {
        // Invalid/expired token — still return success (don't leak info)
      }
    }

    res.json({ success: true, message: "Logged out successfully." });
  } catch (err) {
    next(err);
  }
}

// ── GET /api/auth/me ─────────────────────────────────────────────────────────
export async function me(req, res, next) {
  try {
    const [rows] = await pool.query(
      "SELECT id, name, email, role, is_verified, avatar_url, created_at FROM users WHERE id = ?",
      [req.user.id]
    );

    if (!rows.length) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    res.json({ success: true, data: { user: rows[0] } });
  } catch (err) {
    next(err);
  }
}


// ── POST /api/auth/forgot-password ───────────────────────────────────────────
export async function forgotPassword(req, res, next) {
  try {
    const { email } = req.body;

    const [users] = await pool.query(
      "SELECT id, name FROM users WHERE email = ? AND is_active = 1",
      [email.toLowerCase().trim()]
    );

    // Always return success (don't reveal if email exists)
    if (!users.length) {
      return res.json({ success: true, message: "If this email exists, a reset code has been sent." });
    }

    const user = users[0];

    // Email-based cooldown — 2 min between OTP requests per email
    const [recent] = await pool.query(
      "SELECT created_at FROM password_resets WHERE user_id = ? ORDER BY created_at DESC LIMIT 1",
      [user.id]
    );
    if (recent.length) {
      const lastSent = new Date(recent[0].created_at).getTime();
      const cooldown = 2 * 60 * 1000; // 2 minutes
      if (Date.now() - lastSent < cooldown) {
        const remaining = Math.ceil((cooldown - (Date.now() - lastSent)) / 1000);
        return res.status(429).json({ success: false, message: `Please wait ${remaining} seconds before requesting another code.` });
      }
    }

    // Generate 6-digit OTP
    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Delete old OTPs for this user
    await pool.query("DELETE FROM password_resets WHERE user_id = ?", [user.id]);

    // Save OTP
    await pool.query(
      "INSERT INTO password_resets (id, user_id, otp, expires_at) VALUES (?, ?, ?, ?)",
      [uuidv4(), user.id, otp, expiresAt]
    );

    // Send email
    const { sendEmail, passwordResetEmail } = await import("../utils/mailer.js");
    await sendEmail(
      email,
      "Vidora — Password Reset Code",
      passwordResetEmail(user.name, otp)
    );

    res.json({ success: true, message: "If this email exists, a reset code has been sent." });
  } catch (err) {
    next(err);
  }
}

// ── POST /api/auth/reset-password ────────────────────────────────────────────
export async function resetPassword(req, res, next) {
  try {
    const { email, otp, newPassword } = req.body;

    const [users] = await pool.query(
      "SELECT id FROM users WHERE email = ? AND is_active = 1",
      [email.toLowerCase().trim()]
    );

    if (!users.length) {
      return res.status(400).json({ success: false, message: "Invalid email or OTP." });
    }

    const userId = users[0].id;

    // Verify OTP
    const [otpRows] = await pool.query(
      "SELECT id FROM password_resets WHERE user_id = ? AND otp = ? AND expires_at > NOW() AND used = 0",
      [userId, otp]
    );

    if (!otpRows.length) {
      return res.status(400).json({ success: false, message: "Invalid or expired OTP." });
    }

    // Mark OTP as used
    await pool.query("UPDATE password_resets SET used = 1 WHERE id = ?", [otpRows[0].id]);

    // Update password
    const newHash = await bcrypt.hash(newPassword, 12);
    await pool.query("UPDATE users SET password_hash = ? WHERE id = ?", [newHash, userId]);

    // Invalidate all refresh tokens
    await pool.query("DELETE FROM refresh_tokens WHERE user_id = ?", [userId]);

    res.json({ success: true, message: "Password reset successful. Please log in with your new password." });
  } catch (err) {
    next(err);
  }
}

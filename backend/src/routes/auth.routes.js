import { Router } from "express";
import { body } from "express-validator";
import rateLimit from "express-rate-limit";
import { register, login, refresh, logout, me, forgotPassword, resetPassword } from "../controllers/auth.controller.js";
import { authenticate } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";

const router = Router();

// Strict rate limit for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 10,
  message: { success: false, message: "Too many attempts. Try again in 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
});

// Moderate rate limit for token refresh
const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { success: false, message: "Too many refresh attempts. Try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

// Strict limit specifically for forgot password — 5 per 15 min
const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { success: false, message: "Too many password reset requests. Try again in 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
});

// POST /api/auth/register
router.post(
  "/register",
  authLimiter,
  [
    body("name")
      .trim()
      .notEmpty().withMessage("Name is required.")
      .isLength({ min: 1, max: 100 }).withMessage("Name must be 1–100 characters.")
      .matches(/^[^<>"'%;()&+]+$/).withMessage("Name contains invalid characters."),
    body("email")
      .isEmail().withMessage("Valid email required.")
      .normalizeEmail()
      .isLength({ max: 255 }),
    body("password")
      .isLength({ min: 6, max: 128 }).withMessage("Password must be 6–128 characters."),
  ],
  validate,
  register
);

// POST /api/auth/login
router.post(
  "/login",
  authLimiter,
  [
    body("email")
      .isEmail().withMessage("Valid email required.")
      .normalizeEmail()
      .isLength({ max: 255 }),
    body("password")
      .notEmpty().withMessage("Password is required.")
      .isLength({ max: 128 }).withMessage("Invalid password."),
  ],
  validate,
  login
);

// POST /api/auth/refresh
router.post("/refresh", refreshLimiter, refresh);

// POST /api/auth/logout
router.post("/logout", logout);

// GET /api/auth/me  (protected)
router.get("/me", authenticate, me);

// GET /api/auth/verify-email?token=xxx
router.get("/verify-email", async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) return res.status(400).json({ success: false, message: "Token required." });

    const pool = (await import("../db/connection.js")).default;
    const [rows] = await pool.query(
      "SELECT user_id FROM email_verifications WHERE token = ? AND expires_at > NOW()",
      [token]
    );

    if (!rows.length) {
      return res.status(400).json({ success: false, message: "Invalid or expired verification link." });
    }

    await pool.query("UPDATE users SET is_verified = 1 WHERE id = ?", [rows[0].user_id]);
    await pool.query("DELETE FROM email_verifications WHERE token = ?", [token]);

    res.json({ success: true, message: "Email verified successfully!" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Verification failed." });
  }
});

// POST /api/auth/resend-verification (protected — 10 min cooldown)
router.post("/resend-verification", authenticate, async (req, res) => {
  try {
    const pool = (await import("../db/connection.js")).default;
    const { v4: uuidv4 } = await import("uuid");
    const crypto = await import("crypto");

    const [[user]] = await pool.query("SELECT id, name, email, is_verified FROM users WHERE id = ?", [req.user.id]);
    if (!user) return res.status(404).json({ success: false, message: "User not found." });
    if (user.is_verified) return res.json({ success: true, message: "Already verified." });

    // Check cooldown — last email must be 10+ minutes ago
    const [recent] = await pool.query(
      "SELECT created_at FROM email_verifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 1",
      [user.id]
    );
    if (recent.length) {
      const lastSent = new Date(recent[0].created_at).getTime();
      const cooldown = 10 * 60 * 1000; // 10 minutes
      if (Date.now() - lastSent < cooldown) {
        const remaining = Math.ceil((cooldown - (Date.now() - lastSent)) / 60000);
        return res.status(429).json({ success: false, message: `Please wait ${remaining} minutes before resending.` });
      }
    }

    // Delete old tokens
    await pool.query("DELETE FROM email_verifications WHERE user_id = ?", [user.id]);

    // Generate new
    const verifyToken = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await pool.query(
      "INSERT INTO email_verifications (id, user_id, token, expires_at) VALUES (?, ?, ?, ?)",
      [uuidv4(), user.id, verifyToken, expiresAt]
    );

    const verifyUrl = `${process.env.FRONTEND_URL || "http://localhost:8080"}/verify-email?token=${verifyToken}`;
    const { sendEmail, verificationEmail } = await import("../utils/mailer.js");
    await sendEmail(user.email, "Vidora — Verify Your Email", verificationEmail(user.name, verifyUrl));

    res.json({ success: true, message: "Verification email sent." });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to send." });
  }
});

// POST /api/auth/forgot-password
router.post(
  "/forgot-password",
  forgotPasswordLimiter,
  [body("email").isEmail().withMessage("Valid email required.").normalizeEmail()],
  validate,
  forgotPassword
);

// POST /api/auth/reset-password
router.post(
  "/reset-password",
  forgotPasswordLimiter,
  [
    body("email").isEmail().withMessage("Valid email required.").normalizeEmail(),
    body("otp").isLength({ min: 6, max: 6 }).withMessage("6-digit OTP required."),
    body("newPassword").isLength({ min: 6 }).withMessage("Password must be at least 6 characters."),
  ],
  validate,
  resetPassword
);

export default router;

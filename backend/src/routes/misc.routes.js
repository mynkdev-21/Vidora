import { Router } from "express";
import rateLimit from "express-rate-limit";
import crypto from "crypto";
import pool from "../db/connection.js";
import { authenticate } from "../middleware/auth.js";
import { getPublicSettings, getSetting } from "../utils/settings.js";

// ── Public, no API key ────────────────────────────────────────────────────────
export const publicRouter = Router();

// GET /app-ads.txt — served from admin settings
publicRouter.get("/app-ads.txt", async (_req, res) => {
  try {
    const value = await getSetting("app_ads_txt");
    res.type("text/plain");
    if (value) return res.send(value);
    res.status(404).send("# app-ads.txt not configured");
  } catch {
    res.status(500).type("text/plain").send("# error");
  }
});

const contactLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many messages. Please try again later." },
});

// POST /api/contact — public contact form
publicRouter.post("/api/contact", contactLimiter, async (req, res) => {
  try {
    const { name, email, message, source } = req.body || {};
    if (typeof name !== "string" || typeof email !== "string" || typeof message !== "string"
        || !name.trim() || !email.trim() || !message.trim()) {
      return res.status(400).json({ success: false, message: "Name, email, and message are required." });
    }
    if (message.length > 2000 || name.length > 100 || email.length > 255) {
      return res.status(400).json({ success: false, message: "Message too long (max 2000 chars)." });
    }
    await pool.query(
      "INSERT INTO messages (id, name, email, message, source) VALUES (?, ?, ?, ?, ?)",
      [crypto.randomUUID(), name.trim(), email.trim().toLowerCase(), message.trim(),
        typeof source === "string" ? source.slice(0, 30) : null]
    );
    res.status(201).json({ success: true, message: "Message sent successfully." });
  } catch {
    res.status(500).json({ success: false, message: "Failed to send message." });
  }
});

// ── Behind the API-key guard ──────────────────────────────────────────────────
export const apiRouter = Router();

// GET /api/settings — public app configuration (allowlisted keys only)
apiRouter.get("/settings", async (_req, res) => {
  try {
    const settings = await getPublicSettings();
    res.setHeader("Cache-Control", "private, max-age=300");
    res.json({ success: true, data: settings });
  } catch {
    res.status(500).json({ success: false, message: "Failed to load settings." });
  }
});

// POST /api/fcm/register — store / clear the caller's push token
apiRouter.post("/fcm/register", authenticate, async (req, res) => {
  try {
    const { token } = req.body || {};
    const fcmToken = typeof token === "string" && token.length > 10 && token.length <= 500 ? token : null;
    await pool.query("UPDATE users SET fcm_token = ? WHERE id = ?", [fcmToken, req.user.id]);
    res.json({ success: true });
  } catch {
    res.status(500).json({ success: false, message: "Failed to register token." });
  }
});

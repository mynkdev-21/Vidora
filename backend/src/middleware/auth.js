import jwt from "jsonwebtoken";
import pool from "../db/connection.js";
import { config } from "../config.js";

const BANNED_SUPPORT_URL = "https://t.me/vidorasupport";

/** Verifies a user access token. Throws jsonwebtoken errors on failure. */
export function verifyAccessToken(token) {
  return jwt.verify(token, config.jwt.secret, { algorithms: ["HS256"] });
}

function bearerToken(req) {
  const header = req.headers.authorization;
  return header && header.startsWith("Bearer ") ? header.slice(7) : null;
}

async function loadActiveUser(id) {
  const [rows] = await pool.query("SELECT id, email, role, is_active FROM users WHERE id = ?", [id]);
  return rows[0] || null;
}

/**
 * Verifies JWT access token from Authorization: Bearer <token>
 * Attaches req.user = { id, email, role } on success
 */
export async function authenticate(req, res, next) {
  try {
    const token = bearerToken(req);
    if (!token) {
      return res.status(401).json({ success: false, message: "Access token required." });
    }

    const decoded = verifyAccessToken(token);
    const user = await loadActiveUser(decoded.id);

    if (!user || !user.is_active) {
      const banned = user && !user.is_active;
      return res.status(401).json({
        success: false,
        message: banned
          ? "Your account has been banned. Please contact support."
          : "Account not found or deactivated.",
        code: banned ? "ACCOUNT_BANNED" : undefined,
        support_url: banned ? BANNED_SUPPORT_URL : undefined,
      });
    }

    req.user = { id: user.id, email: user.email, role: user.role };
    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ success: false, message: "Access token expired.", code: "TOKEN_EXPIRED" });
    }
    return res.status(401).json({ success: false, message: "Invalid access token." });
  }
}

/**
 * Like authenticate(), but never rejects: a missing, invalid or expired token
 * simply leaves req.user undefined. For endpoints that behave differently for
 * signed-in users but are also open to anonymous ones.
 */
export async function optionalAuthenticate(req, _res, next) {
  const token = bearerToken(req);
  if (!token) return next();
  try {
    const decoded = verifyAccessToken(token);
    const user = await loadActiveUser(decoded.id);
    if (user && user.is_active) req.user = { id: user.id, email: user.email, role: user.role };
  } catch {
    // Treat as anonymous.
  }
  next();
}

/**
 * Role-based access control — use after authenticate()
 * Usage: authorize("admin")
 */
export function authorize(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user?.role)) {
      return res.status(403).json({ success: false, message: "Insufficient permissions." });
    }
    next();
  };
}

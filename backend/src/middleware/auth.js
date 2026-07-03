import jwt from "jsonwebtoken";
import pool from "../db/connection.js";

/**
 * Verifies JWT access token from Authorization: Bearer <token>
 * Attaches req.user = { id, email, role } on success
 */
export async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ success: false, message: "Access token required." });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Check user still exists and is active
    const [rows] = await pool.query(
      "SELECT id, email, role, is_active FROM users WHERE id = ?",
      [decoded.id]
    );

    if (!rows.length || !rows[0].is_active) {
      return res.status(401).json({
        success: false,
        message: rows.length && !rows[0].is_active
          ? "Your account has been banned. Please contact support."
          : "Account not found or deactivated.",
        code: rows.length && !rows[0].is_active ? "ACCOUNT_BANNED" : undefined,
        support_url: rows.length && !rows[0].is_active ? "https://t.me/vidorasupport" : undefined,
      });
    }

    req.user = { id: rows[0].id, email: rows[0].email, role: rows[0].role };
    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ success: false, message: "Access token expired.", code: "TOKEN_EXPIRED" });
    }
    return res.status(401).json({ success: false, message: "Invalid access token." });
  }
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

import jwt from "jsonwebtoken";
import pool from "../db/connection.js";

/**
 * Verifies admin JWT token from Authorization: Bearer <token>
 * Checks against the `admins` table (separate from users)
 * Attaches req.admin = { id, email } on success
 */
export async function authenticateAdmin(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ success: false, message: "Admin access token required." });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Must be from admin role
    if (decoded.role !== "admin") {
      return res.status(403).json({ success: false, message: "Not an admin token." });
    }

    // Check admin still exists and is active
    const [rows] = await pool.query(
      "SELECT id, email, is_active FROM admins WHERE id = ?",
      [decoded.id]
    );

    if (!rows.length || !rows[0].is_active) {
      return res.status(401).json({ success: false, message: "Admin account not found or deactivated." });
    }

    req.admin = { id: rows[0].id, email: rows[0].email };
    // Also set req.user for compatibility with existing admin controller
    req.user = { id: rows[0].id, email: rows[0].email, role: "admin" };
    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ success: false, message: "Admin token expired.", code: "TOKEN_EXPIRED" });
    }
    return res.status(401).json({ success: false, message: "Invalid admin token." });
  }
}

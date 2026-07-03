import { v4 as uuidv4 } from "uuid";
import pool from "../db/connection.js";

// GET /api/users/payment-methods
export async function getPaymentMethods(req, res, next) {
  try {
    const [rows] = await pool.query(
      "SELECT id, method, name, account_id, ifsc_code, is_default FROM payment_methods WHERE user_id = ? ORDER BY is_default DESC, updated_at DESC",
      [req.user.id]
    );
    res.json({ success: true, data: { methods: rows } });
  } catch (err) { next(err); }
}

// POST /api/users/payment-methods
export async function savePaymentMethod(req, res, next) {
  try {
    const { method, name, account_id, ifsc_code } = req.body;

    if (!method || !name || !account_id) {
      return res.status(400).json({ success: false, message: "Method, name, and account ID are required." });
    }

    // Check if method already exists for user — update it
    const [existing] = await pool.query(
      "SELECT id FROM payment_methods WHERE user_id = ? AND method = ?",
      [req.user.id, method]
    );

    if (existing.length) {
      await pool.query(
        "UPDATE payment_methods SET name = ?, account_id = ?, ifsc_code = ?, is_default = 1 WHERE id = ?",
        [name.trim(), account_id.trim(), ifsc_code?.trim() || null, existing[0].id]
      );
    } else {
      await pool.query(
        "INSERT INTO payment_methods (id, user_id, method, name, account_id, ifsc_code) VALUES (?, ?, ?, ?, ?, ?)",
        [uuidv4(), req.user.id, method, name.trim(), account_id.trim(), ifsc_code?.trim() || null]
      );
    }

    // Set as default (unset others)
    await pool.query(
      "UPDATE payment_methods SET is_default = 0 WHERE user_id = ? AND method != ?",
      [req.user.id, method]
    );
    await pool.query(
      "UPDATE payment_methods SET is_default = 1 WHERE user_id = ? AND method = ?",
      [req.user.id, method]
    );

    res.json({ success: true, message: "Payment method saved." });
  } catch (err) { next(err); }
}

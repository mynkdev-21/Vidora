import pool from "../db/connection.js";

/**
 * Records a privileged admin action. Never pass secret values in `details`
 * (log which settings changed, not what they changed to). Failures are logged
 * but never break the admin action itself.
 */
export async function logAdminAction(req, action, { targetType = null, targetId = null, details = null } = {}) {
  try {
    await pool.query(
      `INSERT INTO admin_audit_log (admin_id, action, target_type, target_id, details, ip, user_agent)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        req.admin?.id || req.user?.id,
        action,
        targetType,
        targetId === null ? null : String(targetId).slice(0, 64),
        details === null ? null : JSON.stringify(details),
        String(req.ip || "").slice(0, 45),
        String(req.get?.("user-agent") || "").slice(0, 255),
      ]
    );
  } catch (err) {
    console.error(`Audit log write failed for ${action}:`, err.message);
  }
}

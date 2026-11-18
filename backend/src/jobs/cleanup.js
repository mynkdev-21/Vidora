/**
 * Periodic removal of expired, single-purpose rows. Deletes in small batches
 * so a large backlog never holds long table locks.
 */
import pool from "../db/connection.js";

const BATCH = 5000;

/** table → WHERE clause selecting rows that are safe to delete. */
export const CLEANUP_RULES = Object.freeze({
  stream_tokens:       "expires_at < NOW()",
  view_tickets:        "expires_at < NOW()",
  refresh_tokens:      "expires_at < NOW()",
  email_verifications: "expires_at < NOW()",
  password_resets:     "expires_at < NOW() OR (used = 1 AND created_at < NOW() - INTERVAL 1 DAY)",
  // De-duplication only needs the current UTC day; keep two days of slack.
  view_counted:        "view_date < UTC_DATE() - INTERVAL 2 DAY",
  view_daily_counters: "view_date < UTC_DATE() - INTERVAL 2 DAY",
});

export async function cleanupExpiredRows(conn = pool) {
  const deleted = {};
  for (const [table, where] of Object.entries(CLEANUP_RULES)) {
    let total = 0;
    for (;;) {
      const [res] = await conn.query(`DELETE FROM \`${table}\` WHERE ${where} LIMIT ${BATCH}`);
      total += res.affectedRows;
      if (res.affectedRows < BATCH) break;
    }
    deleted[table] = total;
  }
  return deleted;
}

/** Runs cleanup shortly after start, then every `intervalMs`. Never keeps the process alive. */
export function startCleanupJob({ intervalMs = 60 * 60 * 1000, initialDelayMs = 60 * 1000 } = {}) {
  const run = () => cleanupExpiredRows()
    .then((d) => {
      const n = Object.values(d).reduce((a, b) => a + b, 0);
      if (n) console.log(`🧹 Cleanup removed ${n} expired rows`, d);
    })
    .catch((err) => console.error("Cleanup job failed:", err.message));

  setTimeout(run, initialDelayMs).unref();
  setInterval(run, intervalMs).unref();
}

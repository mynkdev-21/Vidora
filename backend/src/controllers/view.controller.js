/**
 * Paid view counting (audit finding F5).
 *
 * A paid view requires an authenticated ticket, completed ticket-bound media
 * delivery from /api/play, elapsed time, and an atomic daily-cap reservation.
 *
 * The server decides everything: who the viewer is (user ID when signed in,
 * otherwise req.ip — which honours TRUST_PROXY and ignores raw
 * X-Forwarded-For), how long they waited, whether they already counted today,
 * whether they hit the daily cap, and whether they own the file. Every
 * redemption is written to view_events with its outcome, so rewards are
 * auditable after the fact.
 */
import crypto from "crypto";
import pool from "../db/connection.js";
import { findActiveFile } from "../services/file-lookup.js";
import { getNumericSetting } from "../utils/settings.js";
import { sendStoredFile } from "../utils/media.js";
import { creditViewEarning } from "../services/earnings.service.js";

export const VIEW_TICKET_TTL_SECONDS = 6 * 60 * 60;

export const VIEW_DEFAULTS = Object.freeze({
  minWatchSecondsVideo: 10,
  minWatchSecondsImage: 3,
  dailyCapPerViewer: 100,
});

const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");

const viewerKeyFor = (req) => `u:${req.user.id}`;
const deliveryThreshold = (total) => Math.min(64 * 1024, Math.max(1, Math.ceil(total * 0.1)));

async function minWatchSeconds(mimeType, conn = pool) {
  return String(mimeType || "").startsWith("image/")
    ? getNumericSetting("view_min_watch_seconds_image", VIEW_DEFAULTS.minWatchSecondsImage, conn)
    : getNumericSetting("view_min_watch_seconds", VIEW_DEFAULTS.minWatchSecondsVideo, conn);
}

// ── GET /api/play/:id — stream a file by file ID or share token ──────────────
export async function playFile(req, res, next) {
  try {
    const found = await findActiveFile(req.params.id);
    if (!found) return res.status(404).json({ success: false, message: "File not found." });
    const ticket = req.get("X-View-Ticket");
    if (!ticket) return await sendStoredFile(req, res, found.file);
    if (!req.user || ticket.length < 20 || ticket.length > 100) {
      return res.status(401).json({ success: false, message: "A valid signed-in view ticket is required." });
    }
    const ticketHash = sha256(ticket);
    const [rows] = await pool.query(
      `SELECT id FROM view_tickets WHERE ticket_hash = ? AND file_id = ?
       AND viewer_key = ? AND redeemed_at IS NULL AND expires_at > NOW()`,
      [ticketHash, found.file.id, viewerKeyFor(req)]
    );
    if (!rows.length) return res.status(403).json({ success: false, message: "Invalid view ticket." });
    await sendStoredFile(req, res, found.file, async ({ start, bytes, total }) => {
      if (start !== 0 || !Number.isSafeInteger(total) || total <= 0 ||
          !Number.isSafeInteger(bytes) || bytes < deliveryThreshold(total)) return;
      await pool.query(
        `UPDATE view_tickets SET delivered_at = COALESCE(delivered_at, NOW())
         WHERE ticket_hash = ? AND file_id = ? AND viewer_key = ?
           AND redeemed_at IS NULL AND expires_at > NOW()`,
        [ticketHash, found.file.id, viewerKeyFor(req)]
      );
    });
  } catch (err) {
    next(err);
  }
}

// ── POST /api/view/:token/ticket ─────────────────────────────────────────────
export async function issueViewTicket(req, res, next) {
  try {
    const found = await findActiveFile(req.params.token);
    if (!found) return res.status(404).json({ success: false, message: "File not found." });

    const ticket = crypto.randomBytes(32).toString("base64url");
    await pool.query(
      `INSERT INTO view_tickets (id, ticket_hash, file_id, share_token, viewer_key, expires_at)
       VALUES (?, ?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL ? SECOND))`,
      [crypto.randomUUID(), sha256(ticket), found.file.id, found.shareToken, viewerKeyFor(req), VIEW_TICKET_TTL_SECONDS]
    );

    res.status(201).json({
      success: true,
      data: {
        ticket,
        min_watch_seconds: await minWatchSeconds(found.file.mime_type),
        expires_in: VIEW_TICKET_TTL_SECONDS,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Decides whether a redeemed ticket earns a counted view. Runs inside the
 * caller's transaction. Returns the reason code ("ok" means counted).
 */
async function decideOutcome(conn, { file, viewerKey }) {
  // Every payable ticket is tied to an authenticated account.
  if (viewerKey === `u:${file.user_id}` || viewerKey === `u:${file.payee_user_id}`) return "self_view";

  const cap = await getNumericSetting("view_daily_cap_per_viewer", VIEW_DEFAULTS.dailyCapPerViewer, conn);
  await conn.query(
    `INSERT INTO view_daily_counters (viewer_key, view_date, counted)
     VALUES (?, UTC_DATE(), 0) ON DUPLICATE KEY UPDATE counted = counted`,
    [viewerKey]
  );
  const [[{ counted: today }]] = await conn.query(
    "SELECT counted FROM view_daily_counters WHERE viewer_key = ? AND view_date = UTC_DATE() FOR UPDATE",
    [viewerKey]
  );
  if (today >= cap) return "viewer_daily_cap";

  // Atomic de-duplication: the primary key allows one row per viewer/file/day.
  const [ins] = await conn.query(
    "INSERT IGNORE INTO view_counted (file_id, viewer_key, view_date) VALUES (?, ?, UTC_DATE())",
    [file.id, viewerKey]
  );
  if (ins.affectedRows !== 1) return "duplicate";
  await conn.query(
    "UPDATE view_daily_counters SET counted = counted + 1 WHERE viewer_key = ? AND view_date = UTC_DATE()",
    [viewerKey]
  );
  return "ok";
}

async function recordCountedView(conn, { file, shareToken, ip }) {
  await conn.query("UPDATE files SET view_count = view_count + 1 WHERE id = ?", [file.id]);
  if (shareToken) {
    await conn.query("UPDATE share_tokens SET view_count = view_count + 1 WHERE token = ? AND is_active = 1", [shareToken]);
  } else {
    await conn.query("UPDATE share_tokens SET view_count = view_count + 1 WHERE file_id = ? AND is_active = 1", [file.id]);
  }
  // Legacy per-IP log kept for existing admin reports.
  await conn.query("INSERT INTO view_logs (file_id, ip) VALUES (?, ?)", [file.id, String(ip).slice(0, 45)]);
  // Money: credited at today's rate to whoever earns from this file.
  await creditViewEarning(conn, { fileId: file.id, payeeUserId: file.payee_user_id });
}

const NOT_COUNTED_MESSAGES = {
  self_view: "Views of your own files are not counted.",
  duplicate: "View already counted today.",
  viewer_daily_cap: "Daily view limit reached.",
};

// ── POST /api/view/:token  { ticket } ────────────────────────────────────────
export async function redeemView(req, res, next) {
  const ticket = req.body?.ticket;
  if (typeof ticket !== "string" || ticket.length < 20 || ticket.length > 100) {
    return res.status(400).json({
      success: false,
      code: "VIEW_TICKET_REQUIRED",
      message: "A view ticket is required. Request one from POST /api/view/:token/ticket when playback starts.",
    });
  }

  let conn;
  try {
    const found = await findActiveFile(req.params.token);
    if (!found) return res.status(404).json({ success: false, message: "File not found." });
    const { file } = found;

    conn = await pool.getConnection();
    await conn.beginTransaction();

    const [rows] = await conn.query(
      `SELECT id, file_id, share_token, viewer_key, redeemed_at, delivered_at,
              expires_at <= NOW() AS expired,
              TIMESTAMPDIFF(SECOND, delivered_at, NOW()) AS elapsed
       FROM view_tickets WHERE ticket_hash = ? FOR UPDATE`,
      [sha256(ticket)]
    );
    const t = rows[0];

    if (!t || t.file_id !== file.id || t.viewer_key !== viewerKeyFor(req) || t.redeemed_at || t.expired) {
      await conn.rollback();
      return res.status(400).json({ success: false, code: "INVALID_VIEW_TICKET", message: "View ticket is invalid, expired or already used." });
    }

    if (!t.delivered_at) {
      await conn.rollback();
      return res.status(400).json({ success: false, code: "MEDIA_DELIVERY_REQUIRED", message: "Ticket-bound media delivery is required." });
    }

    const minSeconds = await minWatchSeconds(file.mime_type, conn);
    if (t.elapsed < minSeconds) {
      await conn.rollback(); // ticket stays valid so the client can retry
      return res.status(400).json({
        success: false,
        code: "VIEW_TOO_SOON",
        retry_after: minSeconds - t.elapsed,
        message: "Minimum watch time not reached yet.",
      });
    }

    await conn.query("UPDATE view_tickets SET redeemed_at = NOW() WHERE id = ?", [t.id]);

    const reason = await decideOutcome(conn, { file, viewerKey: t.viewer_key });
    const counted = reason === "ok";
    if (counted) await recordCountedView(conn, { file, shareToken: t.share_token, ip: req.ip });

    await conn.query(
      "INSERT INTO view_events (file_id, viewer_key, user_id, counted, reason) VALUES (?, ?, ?, ?, ?)",
      [file.id, t.viewer_key, req.user?.id || null, counted ? 1 : 0, reason]
    );
    await conn.commit();

    res.json({
      success: true,
      counted,
      reason,
      message: counted ? "View counted." : NOT_COUNTED_MESSAGES[reason],
    });
  } catch (err) {
    if (conn) await conn.rollback().catch(() => {});
    next(err);
  } finally {
    if (conn) conn.release();
  }
}

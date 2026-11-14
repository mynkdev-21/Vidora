/**
 * Earnings and balances — the single source of truth for every place that
 * shows or spends a creator's money (dashboard summary, payout requests,
 * admin user detail).
 *
 *   view earnings = legacy views × legacy_earning_rate / 1000   (frozen by migration 003)
 *                 + ledger rows of type 'view'                    (credited per counted view
 *                                                                   at the rate of the day,
 *                                                                   plus purged legacy views)
 *   total         = view earnings + referral + bonus rows
 *   reserved      = payouts that are pending or processing
 *   available     = total − completed payouts − reserved
 */
import crypto from "crypto";
import pool from "../db/connection.js";
import { getNumericSetting } from "../utils/settings.js";

export const DEFAULT_EARNING_RATE = 5.0; // USD per 1000 views
export const DEFAULT_MIN_PAYOUT = 5.0;
export const DEFAULT_REFERRAL_BONUS_PCT = 5.0;

export const currentEarningRate = (conn = pool) => getNumericSetting("earning_rate", DEFAULT_EARNING_RATE, conn);
export const minPayout = (conn = pool) => getNumericSetting("min_payout", DEFAULT_MIN_PAYOUT, conn);
export const referralBonusPct = (conn = pool) => getNumericSetting("referral_bonus", DEFAULT_REFERRAL_BONUS_PCT, conn);

async function legacyEarningRate(conn) {
  return getNumericSetting("legacy_earning_rate", await currentEarningRate(conn), conn);
}

const round = (n, dp = 4) => Number(Number(n).toFixed(dp));

/** Full balance breakdown for one user. Pass a transaction connection to read under its locks. */
export async function computeBalance(userId, conn = pool) {
  const [[views]] = await conn.query(
    `SELECT COALESCE(SUM(legacy_views), 0) AS legacy_views, COALESCE(SUM(view_count), 0) AS total_views
     FROM files WHERE user_id = ?`,
    [userId]
  );
  const [[user]] = await conn.query("SELECT COALESCE(purged_views, 0) AS purged_views FROM users WHERE id = ?", [userId]);
  const [[ledger]] = await conn.query(
    `SELECT
       COALESCE(SUM(CASE WHEN type = 'view'     THEN amount END), 0) AS views,
       COALESCE(SUM(CASE WHEN type = 'referral' THEN amount END), 0) AS referrals,
       COALESCE(SUM(CASE WHEN type = 'bonus'    THEN amount END), 0) AS bonuses
     FROM earnings WHERE user_id = ?`,
    [userId]
  );
  const [[payouts]] = await conn.query(
    `SELECT
       COALESCE(SUM(CASE WHEN status = 'completed' THEN amount END), 0) AS completed,
       COALESCE(SUM(CASE WHEN status = 'pending' THEN amount END), 0) AS pending,
       COALESCE(SUM(CASE WHEN status = 'processing' THEN amount END), 0) AS processing
     FROM payouts WHERE user_id = ?`,
    [userId]
  );

  const legacyRate = await legacyEarningRate(conn);
  const fromLegacyViews = Number(views.legacy_views) * legacyRate / 1000;
  const fromViews = fromLegacyViews + Number(ledger.views);
  const fromReferrals = Number(ledger.referrals);
  const fromBonuses = Number(ledger.bonuses);
  const total = fromViews + fromReferrals + fromBonuses;
  const completed = Number(payouts.completed);
  const reserved = Number(payouts.pending) + Number(payouts.processing);

  return {
    total_views: Number(views.total_views) + Number(user?.purged_views || 0),
    from_views: round(fromViews),
    from_referrals: round(fromReferrals),
    from_bonuses: round(fromBonuses),
    total: round(total),
    total_paid_out: round(completed, 2),
    pending_payout: round(Number(payouts.pending), 2),
    processing_payout: round(Number(payouts.processing), 2),
    available_balance: round(Math.max(0, total - completed - reserved)),
  };
}

/**
 * Credits one counted view to the payee's ledger at the current rate.
 * Must run inside the transaction that counted the view.
 */
export async function creditViewEarning(conn, { fileId, payeeUserId }) {
  const rate = await currentEarningRate(conn);
  const amount = rate / 1000;
  if (!(amount > 0)) return;
  await conn.query(
    `INSERT INTO earnings (id, user_id, file_id, type, amount, earn_date, view_count)
     VALUES (?, ?, ?, 'view', ?, UTC_DATE(), 1)
     ON DUPLICATE KEY UPDATE amount = amount + VALUES(amount), view_count = view_count + 1`,
    [crypto.randomUUID(), payeeUserId, fileId, amount]
  );
}

/**
 * Pays the referrer's bonus for a completed payout, at most once per payout
 * (enforced by the unique (payout_id, type) key). Returns true if credited.
 */
export async function creditReferralBonus(conn, payout) {
  const [[ref]] = await conn.query("SELECT referred_by FROM users WHERE id = ?", [payout.user_id]);
  if (!ref?.referred_by) return false;
  const bonus = round(Number(payout.amount) * (await referralBonusPct(conn)) / 100, 6);
  if (!(bonus > 0)) return false;
  const [res] = await conn.query(
    "INSERT IGNORE INTO earnings (id, user_id, payout_id, type, amount) VALUES (?, ?, ?, 'referral', ?)",
    [crypto.randomUUID(), ref.referred_by, payout.id, bonus]
  );
  return res.affectedRows === 1;
}

export class PayoutError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

/**
 * Creates a payout request atomically. The user's row is locked for the
 * duration of the transaction, so concurrent requests are serialised and each
 * one sees the balance left by the previous one.
 */
export async function requestPayout(userId, { amount, method }) {
  const requested = Math.floor(Number(amount) * 100) / 100; // whole cents, never round up
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [locked] = await conn.query("SELECT id FROM users WHERE id = ? AND is_active = 1 FOR UPDATE", [userId]);
    if (!locked.length) throw new PayoutError("Account not found.", 404);

    const [balance, min] = [await computeBalance(userId, conn), await minPayout(conn)];
    if (!(requested >= min)) {
      throw new PayoutError(`Minimum payout is $${min}.`);
    }
    if (balance.available_balance < min) {
      throw new PayoutError(`Minimum payout is $${min}. Your available balance is $${balance.available_balance.toFixed(2)}.`);
    }
    if (requested > balance.available_balance) {
      throw new PayoutError("Requested amount exceeds available balance.");
    }

    const id = crypto.randomUUID();
    await conn.query("INSERT INTO payouts (id, user_id, amount, method) VALUES (?, ?, ?, ?)", [id, userId, requested, method]);
    await conn.commit();
    return { id, amount: requested };
  } catch (err) {
    await conn.rollback().catch(() => {});
    throw err;
  } finally {
    conn.release();
  }
}

// ── Payout status changes (admin) ─────────────────────────────────────────────

/** Allowed admin transitions. completed is terminal; failed can be reopened. */
export const PAYOUT_TRANSITIONS = Object.freeze({
  pending:    ["processing", "completed", "failed"],
  processing: ["pending", "completed", "failed"],
  failed:     ["pending"],
  completed:  [],
});

/**
 * Applies an admin status change in a transaction with the payout row locked.
 * Re-sending the current status only updates the details (no side effects).
 * Returns { payout, previousStatus, transitioned, referralCredited }.
 */
export async function updatePayoutStatus(payoutId, { status, transaction_id, notes, receipt_url }) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [rows] = await conn.query("SELECT id, user_id, amount, method, status FROM payouts WHERE id = ? FOR UPDATE", [payoutId]);
    const payout = rows[0];
    if (!payout) throw new PayoutError("Payout not found.", 404);

    const previousStatus = payout.status;
    const transitioned = status !== previousStatus;
    if (transitioned && !PAYOUT_TRANSITIONS[previousStatus].includes(status)) {
      throw new PayoutError(`Cannot change a ${previousStatus} payout to ${status}.`, 409);
    }

    const updates = ["status = ?"];
    const values = [status];
    if (transaction_id !== undefined) { updates.push("transaction_id = ?"); values.push(transaction_id); }
    if (notes !== undefined) { updates.push("notes = ?"); values.push(notes); }
    if (receipt_url !== undefined) { updates.push("receipt_url = ?"); values.push(receipt_url); }
    if (transitioned && (status === "completed" || status === "failed")) updates.push("processed_at = NOW()");
    if (transitioned && status === "pending") updates.push("processed_at = NULL");
    values.push(payoutId);
    await conn.query(`UPDATE payouts SET ${updates.join(", ")} WHERE id = ?`, values);

    let referralCredited = false;
    if (transitioned && status === "completed") referralCredited = await creditReferralBonus(conn, payout);

    await conn.commit();
    return { payout: { ...payout, status }, previousStatus, transitioned, referralCredited };
  } catch (err) {
    await conn.rollback().catch(() => {});
    throw err;
  } finally {
    conn.release();
  }
}

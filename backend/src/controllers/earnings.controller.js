import pool from "../db/connection.js";
import {
  computeBalance, currentEarningRate, minPayout, referralBonusPct,
  requestPayout as createPayout, PayoutError,
} from "../services/earnings.service.js";

// ── GET /api/earnings ────────────────────────────────────────────────────────
export async function getEarnings(req, res, next) {
  try {
    const page   = Math.max(1, parseInt(req.query.page)  || 1);
    const limit  = Math.min(100, parseInt(req.query.limit) || 20);
    const offset = (page - 1) * limit;

    const [rows] = await pool.query(
      `SELECT e.id, e.type, e.amount, e.currency, e.created_at,
              f.original_name AS file_name
       FROM earnings e
       LEFT JOIN files f ON f.id = e.file_id
       WHERE e.user_id = ?
       ORDER BY e.created_at DESC
       LIMIT ? OFFSET ?`,
      [req.user.id, limit, offset]
    );

    const [[{ total_earnings }]] = await pool.query(
      "SELECT COALESCE(SUM(amount), 0) AS total_earnings FROM earnings WHERE user_id = ?",
      [req.user.id]
    );

    const [[{ total }]] = await pool.query(
      "SELECT COUNT(*) AS total FROM earnings WHERE user_id = ?",
      [req.user.id]
    );

    res.json({
      success: true,
      data: {
        earnings:       rows,
        total_earnings: parseFloat(total_earnings),
        pagination:     { page, limit, total, pages: Math.ceil(total / limit) },
      },
    });
  } catch (err) {
    next(err);
  }
}

// ── GET /api/earnings/summary ────────────────────────────────────────────────
export async function getEarningsSummary(req, res, next) {
  try {
    const [balance, rate, min] = await Promise.all([
      computeBalance(req.user.id), currentEarningRate(), minPayout(),
    ]);
    res.json({
      success: true,
      data: {
        total_views:       balance.total_views,
        rate_per_1000:     rate,
        min_payout:        min,
        total:             balance.total,
        from_views:        balance.from_views,
        from_referrals:    balance.from_referrals,
        today:             0, // TODO: track daily views
        this_week:         0, // TODO: track weekly views
        this_month:        balance.from_views, // approximate
        total_paid_out:    balance.total_paid_out,
        pending_payout:    balance.pending_payout,
        available_balance: balance.available_balance,
      },
    });
  } catch (err) {
    next(err);
  }
}

// ── POST /api/earnings/payouts ───────────────────────────────────────────────
export async function requestPayout(req, res, next) {
  try {
    const { amount, method } = req.body;
    const payout = await createPayout(req.user.id, { amount, method });
    res.status(201).json({ success: true, message: "Payout request submitted.", data: { payout_id: payout.id } });
  } catch (err) {
    if (err instanceof PayoutError) return res.status(err.status).json({ success: false, message: err.message });
    next(err);
  }
}

// ── GET /api/earnings/referral-stats ──────────────────────────────────────────
export async function getReferralStats(req, res, next) {
  try {
    // Count how many users this person referred
    const [[{ total_referrals }]] = await pool.query(
      "SELECT COUNT(*) AS total_referrals FROM users WHERE referred_by = ?",
      [req.user.id]
    );

    // Get referred users list
    const [referredUsers] = await pool.query(
      "SELECT id, name, email, created_at FROM users WHERE referred_by = ? ORDER BY created_at DESC",
      [req.user.id]
    );

    // Total referral earnings
    const [[{ total_earned }]] = await pool.query(
      "SELECT COALESCE(SUM(amount), 0) AS total_earned FROM earnings WHERE user_id = ? AND type = 'referral'",
      [req.user.id]
    );

    res.json({
      success: true,
      data: {
        total_referrals: parseInt(total_referrals) || 0,
        total_earned: parseFloat(total_earned) || 0,
        referral_code: req.user.id,
        bonus_percent: await referralBonusPct(),
        referrals: referredUsers,
      },
    });
  } catch (err) { next(err); }
}

// ── GET /api/earnings/payouts ────────────────────────────────────────────────
export async function getPayouts(req, res, next) {
  try {
    const [rows] = await pool.query(
      "SELECT id, amount, currency, method, status, transaction_id, notes, receipt_url, requested_at, processed_at FROM payouts WHERE user_id = ? ORDER BY requested_at DESC",
      [req.user.id]
    );
    res.json({ success: true, data: { payouts: rows } });
  } catch (err) {
    next(err);
  }
}

import { v4 as uuidv4 } from "uuid";
import pool from "../db/connection.js";

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

// ── Rate: dynamic from app_settings ───────────────────────────────────────────
async function getEarningRate() {
  try {
    const [[row]] = await pool.query("SELECT value FROM app_settings WHERE id = 'earning_rate'");
    return row ? parseFloat(row.value) : 5.0;
  } catch { return 5.0; }
}

async function getMinPayout() {
  try {
    const [[row]] = await pool.query("SELECT value FROM app_settings WHERE id = 'min_payout'");
    return row ? parseFloat(row.value) : 5.0;
  } catch { return 5.0; }
}

async function getReferralBonusPct() {
  try {
    const [[row]] = await pool.query("SELECT value FROM app_settings WHERE id = 'referral_bonus'");
    return row ? parseFloat(row.value) : 5.0;
  } catch { return 5.0; }
}

// ── GET /api/earnings/summary ────────────────────────────────────────────────
export async function getEarningsSummary(req, res, next) {
  try {
    const RATE = await getEarningRate();
    const RATE_PER_VIEW = RATE / 1000;

    // Calculate earnings from view counts (include ALL existing files)
    const [[viewData]] = await pool.query(
      `SELECT COALESCE(SUM(view_count), 0) AS total_views
       FROM files WHERE user_id = ?`,
      [req.user.id]
    );

    // Include purged views from users table
    const [[userData]] = await pool.query(
      "SELECT COALESCE(purged_views, 0) AS purged_views FROM users WHERE id = ?",
      [req.user.id]
    );

    const totalViews = (parseInt(viewData.total_views) || 0) + (parseInt(userData.purged_views) || 0);
    const fromActiveViews = (parseInt(viewData.total_views) || 0) * RATE_PER_VIEW;

    // Also check earnings table for saved view earnings (from purged files) + referral/bonuses
    const [[bonuses]] = await pool.query(
      `SELECT
         COALESCE(SUM(CASE WHEN type='view'     THEN amount ELSE 0 END),0) AS from_purged_views,
         COALESCE(SUM(CASE WHEN type='referral' THEN amount ELSE 0 END),0) AS from_referrals,
         COALESCE(SUM(CASE WHEN type='bonus'    THEN amount ELSE 0 END),0) AS from_bonuses
       FROM earnings WHERE user_id = ?`,
      [req.user.id]
    );

    const fromPurgedViews = parseFloat(bonuses.from_purged_views) || 0;
    const fromViews = fromActiveViews + fromPurgedViews;
    const fromReferrals = parseFloat(bonuses.from_referrals) || 0;
    const total = fromViews + fromReferrals + (parseFloat(bonuses.from_bonuses) || 0);

    const [[payoutSummary]] = await pool.query(
      `SELECT
         COALESCE(SUM(CASE WHEN status='completed' THEN amount ELSE 0 END),0) AS total_paid_out,
         COALESCE(SUM(CASE WHEN status='pending'   THEN amount ELSE 0 END),0) AS pending_payout
       FROM payouts WHERE user_id = ?`,
      [req.user.id]
    );

    const totalPaidOut = parseFloat(payoutSummary.total_paid_out) || 0;
    const pendingPayout = parseFloat(payoutSummary.pending_payout) || 0;
    const available = Math.max(0, total - totalPaidOut - pendingPayout);

    res.json({
      success: true,
      data: {
        total_views:      totalViews,
        rate_per_1000:    RATE,
        min_payout:       await getMinPayout(),
        total:            parseFloat(total.toFixed(4)),
        from_views:       parseFloat(fromViews.toFixed(4)),
        from_referrals:   fromReferrals,
        today:            0, // TODO: track daily views
        this_week:        0, // TODO: track weekly views
        this_month:       parseFloat(fromViews.toFixed(4)), // approximate
        total_paid_out:   totalPaidOut,
        pending_payout:   pendingPayout,
        available_balance: parseFloat(available.toFixed(4)),
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
    const MIN_PAYOUT = await getMinPayout();
    const RATE = await getEarningRate();

    // Check available balance (earnings from views + referral bonuses - payouts)
    // Include ALL files — deleted files still earned views
    const [[viewData]] = await pool.query(
      `SELECT COALESCE(SUM(view_count), 0) AS total_views
       FROM files WHERE user_id = ?`,
      [req.user.id]
    );
    const totalViews = parseInt(viewData.total_views) || 0;
    const fromActiveViews = totalViews * RATE / 1000;

    const [[bonuses]] = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) AS bonus_total
       FROM earnings WHERE user_id = ? AND type IN ('referral','bonus','view')`,
      [req.user.id]
    );
    const totalEarned = fromActiveViews + (parseFloat(bonuses.bonus_total) || 0);

    const [[payoutData]] = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) AS paid
       FROM payouts WHERE user_id = ? AND status IN ('pending','processing','completed')`,
      [req.user.id]
    );
    const totalPaid = parseFloat(payoutData.paid) || 0;
    const available = Math.max(0, totalEarned - totalPaid);

    if (available < MIN_PAYOUT) {
      return res.status(400).json({
        success: false,
        message: `Minimum payout is $${MIN_PAYOUT}. Your available balance is $${available.toFixed(2)}.`,
      });
    }

    if (parseFloat(amount) > available) {
      return res.status(400).json({ success: false, message: "Requested amount exceeds available balance." });
    }

    const id = uuidv4();
    await pool.query(
      "INSERT INTO payouts (id, user_id, amount, method) VALUES (?, ?, ?, ?)",
      [id, req.user.id, amount, method]
    );

    res.status(201).json({ success: true, message: "Payout request submitted.", data: { payout_id: id } });
  } catch (err) {
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
        bonus_percent: await getReferralBonusPct(),
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

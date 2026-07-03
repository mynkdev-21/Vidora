import pool from "../db/connection.js";

// ── GET /api/admin/stats ─────────────────────────────────────────────────────
export async function getStats(req, res, next) {
  try {
    const [[{ totalUsers }]] = await pool.query("SELECT COUNT(*) AS totalUsers FROM users");
    const [[{ totalFiles }]] = await pool.query("SELECT COUNT(*) AS totalFiles FROM files WHERE status = 'active'");
    // Total views = all files (including deleted) + purged_views saved in users table
    const [[{ totalFilesViews }]] = await pool.query("SELECT COALESCE(SUM(view_count), 0) AS totalFilesViews FROM files");
    const [[{ totalPurgedViews }]] = await pool.query("SELECT COALESCE(SUM(purged_views), 0) AS totalPurgedViews FROM users");
    const totalViews = parseInt(totalFilesViews) + parseInt(totalPurgedViews);
    const [[{ totalStorage }]] = await pool.query("SELECT COALESCE(SUM(size_bytes), 0) AS totalStorage FROM files WHERE status = 'active'");
    const [[{ pendingPayouts }]] = await pool.query("SELECT COUNT(*) AS pendingPayouts FROM payouts WHERE status = 'pending'");
    const [[{ pendingAmount }]] = await pool.query("SELECT COALESCE(SUM(amount), 0) AS pendingAmount FROM payouts WHERE status = 'pending'");
    const [[{ totalPaidOut }]] = await pool.query("SELECT COALESCE(SUM(amount), 0) AS totalPaidOut FROM payouts WHERE status = 'completed'");
    const [[{ todayUsers }]] = await pool.query("SELECT COUNT(*) AS todayUsers FROM users WHERE DATE(created_at) = CURDATE()");
    const [[{ todayFiles }]] = await pool.query("SELECT COUNT(*) AS todayFiles FROM files WHERE DATE(created_at) = CURDATE() AND status = 'active'");
    // Use view_logs for accurate today's views count
    const [[{ todayViews }]] = await pool.query("SELECT COUNT(*) AS todayViews FROM view_logs WHERE DATE(created_at) = CURDATE()");

    // Platform earnings (what users earned = $5/1000 views)
    const platformEarnings = (parseInt(totalViews) * 5.0 / 1000);

    // Fetch earning rate and min payout from settings
    let earningRate = 5.0;
    let minPayout = 5.0;
    try {
      const [[rateSetting]] = await pool.query("SELECT value FROM app_settings WHERE id = 'earning_rate'");
      if (rateSetting) earningRate = parseFloat(rateSetting.value);
      const [[minSetting]] = await pool.query("SELECT value FROM app_settings WHERE id = 'min_payout'");
      if (minSetting) minPayout = parseFloat(minSetting.value);
    } catch {}

    res.json({
      success: true,
      data: {
        totalUsers: parseInt(totalUsers),
        totalFiles: parseInt(totalFiles),
        totalViews: parseInt(totalViews),
        totalStorage: parseInt(totalStorage),
        pendingPayouts: parseInt(pendingPayouts),
        pendingAmount: parseFloat(pendingAmount),
        totalPaidOut: parseFloat(totalPaidOut),
        platformEarnings: parseFloat(platformEarnings.toFixed(2)),
        todayUsers: parseInt(todayUsers),
        todayFiles: parseInt(todayFiles),
        todayViews: parseInt(todayViews),
        earningRate,
        minPayout,
      },
    });
  } catch (err) { next(err); }
}

// ── GET /api/admin/users ─────────────────────────────────────────────────────
export async function getUsers(req, res, next) {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 20);
    const offset = (page - 1) * limit;
    const search = req.query.search || "";

    let whereClause = "1=1";
    const params = [];

    if (search) {
      whereClause += " AND (u.name LIKE ? OR u.email LIKE ?)";
      params.push(`%${search}%`, `%${search}%`);
    }

    const [rows] = await pool.query(
      `SELECT u.id, u.name, u.email, u.role, u.is_active, u.is_verified, u.is_premium, u.avatar_url, u.created_at,
              (SELECT COUNT(*) FROM files WHERE user_id = u.id AND status = 'active') AS file_count,
              (SELECT COALESCE(SUM(view_count), 0) FROM files WHERE user_id = u.id AND status = 'active') AS total_views,
              (SELECT COALESCE(SUM(size_bytes), 0) FROM files WHERE user_id = u.id AND status = 'active') AS storage_used
       FROM users u
       WHERE ${whereClause}
       ORDER BY u.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total FROM users u WHERE ${whereClause}`,
      params
    );

    res.json({
      success: true,
      data: { users: rows, pagination: { page, limit, total: parseInt(total), pages: Math.ceil(total / limit) } },
    });
  } catch (err) { next(err); }
}

// ── PATCH /api/admin/users/:id ───────────────────────────────────────────────
export async function updateUser(req, res, next) {
  try {
    const { id } = req.params;
    const { role, is_active } = req.body;

    // Don't allow admin to deactivate themselves
    if (id === req.user.id && is_active === false) {
      return res.status(400).json({ success: false, message: "Cannot deactivate your own account." });
    }

    const updates = [];
    const values = [];

    if (role !== undefined && ["creator", "admin"].includes(role)) {
      updates.push("role = ?");
      values.push(role);
    }
    if (is_active !== undefined) {
      updates.push("is_active = ?");
      values.push(is_active ? 1 : 0);
    }

    if (!updates.length) {
      return res.status(400).json({ success: false, message: "No valid fields to update." });
    }

    values.push(id);
    await pool.query(`UPDATE users SET ${updates.join(", ")} WHERE id = ?`, values);

    res.json({ success: true, message: "User updated." });
  } catch (err) { next(err); }
}

// ── DELETE /api/admin/users/:id ──────────────────────────────────────────────
export async function deleteUser(req, res, next) {
  try {
    const { id } = req.params;

    if (id === req.user.id) {
      return res.status(400).json({ success: false, message: "Cannot delete your own account." });
    }

    await pool.query("UPDATE users SET is_active = 0 WHERE id = ?", [id]);
    res.json({ success: true, message: "User deactivated." });
  } catch (err) { next(err); }
}

// ── GET /api/admin/files ─────────────────────────────────────────────────────
export async function getFiles(req, res, next) {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 20);
    const offset = (page - 1) * limit;
    const search = req.query.search || "";
    const status = req.query.status || "";

    let whereClause = "1=1";
    const params = [];

    if (search) {
      whereClause += " AND (f.original_name LIKE ? OR u.name LIKE ? OR u.email LIKE ?)";
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (status && ["active", "processing", "deleted"].includes(status)) {
      whereClause += " AND f.status = ?";
      params.push(status);
    }

    const [rows] = await pool.query(
      `SELECT f.id, f.original_name, f.mime_type, f.size_bytes, f.status, f.view_count,
              f.thumbnail_url, f.created_at,
              u.name AS uploader_name, u.email AS uploader_email
       FROM files f
       JOIN users u ON u.id = f.user_id
       WHERE ${whereClause}
       ORDER BY f.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total FROM files f JOIN users u ON u.id = f.user_id WHERE ${whereClause}`,
      params
    );

    res.json({
      success: true,
      data: { files: rows, pagination: { page, limit, total: parseInt(total), pages: Math.ceil(total / limit) } },
    });
  } catch (err) { next(err); }
}

// ── PATCH /api/admin/files/:id ───────────────────────────────────────────────
export async function updateFile(req, res, next) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!["active", "deleted"].includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status." });
    }

    await pool.query("UPDATE files SET status = ? WHERE id = ?", [status, id]);
    res.json({ success: true, message: `File ${status === "deleted" ? "deleted" : "restored"}.` });
  } catch (err) { next(err); }
}

// ── DELETE /api/admin/files/:id ──────────────────────────────────────────────
export async function deleteFile(req, res, next) {
  try {
    const { id } = req.params;
    await pool.query("UPDATE files SET status = 'deleted' WHERE id = ?", [id]);
    res.json({ success: true, message: "File deleted." });
  } catch (err) { next(err); }
}

// ── DELETE /api/admin/files/purge — Permanently delete all soft-deleted files ─
export async function purgeDeletedFiles(req, res, next) {
  try {
    // Get all deleted files with their view counts and owners
    const [files] = await pool.query(
      "SELECT id, user_id, stored_name, thumbnail_url, view_count FROM files WHERE status = 'deleted'"
    );

    if (!files.length) {
      return res.json({ success: true, message: "No deleted files to purge.", data: { count: 0 } });
    }

    // Before deleting: save view counts to earnings table so they're preserved
    const { v4: uuidv4 } = await import("uuid");

    // Get earning rate
    let earningRate = 5.0;
    try {
      const [[rateSetting]] = await pool.query("SELECT value FROM app_settings WHERE id = 'earning_rate'");
      if (rateSetting) earningRate = parseFloat(rateSetting.value);
    } catch {}

    for (const file of files) {
      if (file.view_count > 0) {
        // Save earnings from views as a permanent record before deleting the file
        const amount = (file.view_count * earningRate / 1000);
        await pool.query(
          "INSERT INTO earnings (id, user_id, file_id, type, amount) VALUES (?, ?, NULL, 'view', ?)",
          [uuidv4(), file.user_id, amount]
        );
        // Save view count to user's purged_views total
        await pool.query(
          "UPDATE users SET purged_views = purged_views + ? WHERE id = ?",
          [file.view_count, file.user_id]
        );
      }
    }

    // Delete from storage (local + cloud)
    const { deleteFromStorage } = await import("../utils/storage.js");
    let deletedCount = 0;

    for (const file of files) {
      try {
        // Delete main file
        await deleteFromStorage(file.stored_name);
        // Delete thumbnail if exists
        if (file.thumbnail_url) {
          const thumbName = file.thumbnail_url.replace(/^\/thumbnails\//, "");
          await deleteFromStorage(thumbName, "thumbnails");
        }
      } catch (e) {
        // Continue even if storage delete fails
      }

      // Delete from DB permanently
      await pool.query("DELETE FROM share_tokens WHERE file_id = ?", [file.id]);
      await pool.query("DELETE FROM view_logs WHERE file_id = ?", [file.id]);
      await pool.query("DELETE FROM files WHERE id = ?", [file.id]);
      deletedCount++;
    }

    res.json({ success: true, message: `Purged ${deletedCount} files permanently. Earnings preserved.`, data: { count: deletedCount } });
  } catch (err) { next(err); }
}

// ── GET /api/admin/payouts ───────────────────────────────────────────────────
export async function getPayouts(req, res, next) {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 20);
    const offset = (page - 1) * limit;
    const status = req.query.status || "";

    let whereClause = "1=1";
    const params = [];

    if (status && ["pending", "processing", "completed", "failed"].includes(status)) {
      whereClause += " AND p.status = ?";
      params.push(status);
    }

    const [rows] = await pool.query(
      `SELECT p.id, p.user_id, p.amount, p.currency, p.method, p.status, p.transaction_id,
              p.notes, p.receipt_url, p.requested_at, p.processed_at,
              u.name AS user_name, u.email AS user_email,
              pm.account_id AS payment_account, pm.name AS payment_name, pm.ifsc_code AS payment_ifsc
       FROM payouts p
       JOIN users u ON u.id = p.user_id
       LEFT JOIN payment_methods pm ON pm.user_id = p.user_id AND pm.method = p.method
       WHERE ${whereClause}
       ORDER BY p.requested_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total FROM payouts p WHERE ${whereClause}`,
      params
    );

    res.json({
      success: true,
      data: { payouts: rows, pagination: { page, limit, total: parseInt(total), pages: Math.ceil(total / limit) } },
    });
  } catch (err) { next(err); }
}

// ── PATCH /api/admin/payouts/:id ─────────────────────────────────────────────
export async function updatePayout(req, res, next) {
  try {
    const { id } = req.params;
    const { status, transaction_id, notes, receipt_url } = req.body;

    if (!["pending", "processing", "completed", "failed"].includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status." });
    }

    const updates = ["status = ?"];
    const values = [status];

    if (transaction_id !== undefined) {
      updates.push("transaction_id = ?");
      values.push(transaction_id);
    }
    if (notes !== undefined) {
      updates.push("notes = ?");
      values.push(notes);
    }
    if (receipt_url !== undefined) {
      updates.push("receipt_url = ?");
      values.push(receipt_url);
    }
    if (status === "completed" || status === "failed") {
      updates.push("processed_at = NOW()");
    }

    values.push(id);
    await pool.query(`UPDATE payouts SET ${updates.join(", ")} WHERE id = ?`, values);

    // Auto-notify user on payout status change
    if (status === "completed" || status === "failed") {
      const [[payout]] = await pool.query("SELECT user_id, amount FROM payouts WHERE id = ?", [id]);
      if (payout) {
        const { createNotification } = await import("./admin.controller.js");
        const [[userData]] = await pool.query("SELECT name, email FROM users WHERE id = ?", [payout.user_id]);

        if (status === "completed") {
          await createNotification(payout.user_id, "Payout Completed", `Your withdrawal of $${parseFloat(payout.amount).toFixed(2)} has been processed successfully.`, "payout");
          // Send email
          if (userData) {
            const { sendEmail, payoutCompletedEmail } = await import("../utils/mailer.js");
            // Fetch full payout details for method and txn id
            const [[payoutDetail]] = await pool.query("SELECT method, transaction_id FROM payouts WHERE id = ?", [id]);
            const payoutMethod = payoutDetail?.method || req.body.method || "bank transfer";
            const txnId = transaction_id || payoutDetail?.transaction_id || null;
            sendEmail(userData.email, "Vidora — Payout Completed ✓", payoutCompletedEmail(userData.name, payout.amount, payoutMethod, txnId)).catch(() => {});
          }
        } else {
          await createNotification(payout.user_id, "Payout Failed", `Your withdrawal of $${parseFloat(payout.amount).toFixed(2)} was rejected. Check your withdraw page for details.`, "payout");
          // Send email
          if (userData) {
            const { sendEmail, payoutFailedEmail } = await import("../utils/mailer.js");
            sendEmail(userData.email, "Vidora — Payout Failed", payoutFailedEmail(userData.name, payout.amount, notes)).catch(() => {});
          }
        }
      }
    }

    // If completed, give referral bonus to the referrer
    if (status === "completed") {
      const [[payout]] = await pool.query("SELECT user_id, amount FROM payouts WHERE id = ?", [id]);
      if (payout) {
        const [[refData]] = await pool.query("SELECT referred_by FROM users WHERE id = ?", [payout.user_id]);
        if (refData && refData.referred_by) {
          const { v4: uuidv4 } = await import("uuid");
          // Get referral bonus percentage from settings
          let bonusPct = 5;
          try {
            const [[setting]] = await pool.query("SELECT value FROM app_settings WHERE id = 'referral_bonus'");
            if (setting) bonusPct = parseFloat(setting.value);
          } catch {}
          const bonus = parseFloat((payout.amount * bonusPct / 100).toFixed(4));
          if (bonus > 0) {
            await pool.query(
              "INSERT INTO earnings (id, user_id, type, amount) VALUES (?, ?, 'referral', ?)",
              [uuidv4(), refData.referred_by, bonus]
            );
          }
        }
      }
    }

    res.json({ success: true, message: `Payout ${status}.` });
  } catch (err) { next(err); }
}

// ── GET /api/admin/analytics ─────────────────────────────────────────────────
export async function getAnalytics(req, res, next) {
  try {
    // Last 30 days user signups
    const [userGrowth] = await pool.query(
      `SELECT DATE(created_at) AS date, COUNT(*) AS count
       FROM users
       WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
       GROUP BY DATE(created_at)
       ORDER BY date ASC`
    );

    // Last 30 days file uploads
    const [uploadGrowth] = await pool.query(
      `SELECT DATE(created_at) AS date, COUNT(*) AS count
       FROM files
       WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY) AND status = 'active'
       GROUP BY DATE(created_at)
       ORDER BY date ASC`
    );

    // Top uploaders
    const [topUploaders] = await pool.query(
      `SELECT u.id, u.name, u.email,
              COUNT(f.id) AS file_count,
              COALESCE(SUM(f.view_count), 0) AS total_views,
              COALESCE(SUM(f.size_bytes), 0) AS storage_used
       FROM users u
       LEFT JOIN files f ON f.user_id = u.id AND f.status = 'active'
       GROUP BY u.id
       ORDER BY total_views DESC
       LIMIT 10`
    );

    // Recent payouts
    const [recentPayouts] = await pool.query(
      `SELECT p.id, p.amount, p.method, p.status, p.requested_at,
              u.name AS user_name
       FROM payouts p
       JOIN users u ON u.id = p.user_id
       ORDER BY p.requested_at DESC
       LIMIT 10`
    );

    res.json({
      success: true,
      data: { userGrowth, uploadGrowth, topUploaders, recentPayouts },
    });
  } catch (err) { next(err); }
}


// ── GET /api/admin/messages ──────────────────────────────────────────────────
export async function getMessages(req, res, next) {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 20);
    const offset = (page - 1) * limit;
    const filter = req.query.filter || ""; // "unread" or ""

    let whereClause = "1=1";
    const params = [];

    if (filter === "unread") {
      whereClause += " AND is_read = 0";
    }

    const [rows] = await pool.query(
      `SELECT id, name, email, message, source, is_read, created_at
       FROM messages
       WHERE ${whereClause}
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total FROM messages WHERE ${whereClause}`,
      params
    );

    const [[{ unread }]] = await pool.query(
      "SELECT COUNT(*) AS unread FROM messages WHERE is_read = 0"
    );

    res.json({
      success: true,
      data: { messages: rows, unread: parseInt(unread), pagination: { page, limit, total: parseInt(total), pages: Math.ceil(total / limit) } },
    });
  } catch (err) { next(err); }
}

// ── PATCH /api/admin/messages/:id ────────────────────────────────────────────
export async function updateMessage(req, res, next) {
  try {
    const { id } = req.params;
    const { is_read } = req.body;

    await pool.query("UPDATE messages SET is_read = ? WHERE id = ?", [is_read ? 1 : 0, id]);
    res.json({ success: true, message: "Message updated." });
  } catch (err) { next(err); }
}

// ── DELETE /api/admin/messages/:id ───────────────────────────────────────────
export async function deleteMessage(req, res, next) {
  try {
    const { id } = req.params;
    await pool.query("DELETE FROM messages WHERE id = ?", [id]);
    res.json({ success: true, message: "Message deleted." });
  } catch (err) { next(err); }
}


// ── GET /api/admin/settings ──────────────────────────────────────────────────
export async function getSettings(req, res, next) {
  try {
    const [rows] = await pool.query("SELECT id, value, updated_at FROM app_settings");
    res.json({ success: true, data: { settings: rows } });
  } catch (err) { next(err); }
}

// ── PUT /api/admin/settings ──────────────────────────────────────────────────
export async function updateSettings(req, res, next) {
  try {
    const { settings } = req.body; // { website_url: "...", youtube_url: "...", ... }

    if (!settings || typeof settings !== "object") {
      return res.status(400).json({ success: false, message: "Settings object required." });
    }

    for (const [key, value] of Object.entries(settings)) {
      await pool.query(
        "INSERT INTO app_settings (id, value) VALUES (?, ?) ON DUPLICATE KEY UPDATE value = ?",
        [key, value, value]
      );
    }

    res.json({ success: true, message: "Settings updated." });
  } catch (err) { next(err); }
}


// ── GET /api/admin/users/:id ─────────────────────────────────────────────────
export async function getUserDetail(req, res, next) {
  try {
    const { id } = req.params;

    const [rows] = await pool.query(
      `SELECT u.id, u.name, u.email, u.role, u.is_active, u.is_verified, u.avatar_url, u.referred_by, u.created_at, u.updated_at,
              (SELECT COUNT(*) FROM files WHERE user_id = u.id AND status = 'active') AS total_files,
              (SELECT COALESCE(SUM(view_count), 0) FROM files WHERE user_id = u.id AND status = 'active') AS total_views,
              (SELECT COALESCE(SUM(size_bytes), 0) FROM files WHERE user_id = u.id AND status = 'active') AS storage_used
       FROM users u WHERE u.id = ?`,
      [id]
    );

    if (!rows.length) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    const user = rows[0];

    // Get API key
    const [apiKeyRows] = await pool.query(
      "SELECT api_key, created_at FROM user_api_keys WHERE user_id = ?",
      [id]
    );
    user.api_key = apiKeyRows.length ? apiKeyRows[0].api_key : null;
    user.api_key_created = apiKeyRows.length ? apiKeyRows[0].created_at : null;

    // Get payment methods
    const [paymentMethods] = await pool.query(
      "SELECT id, method, name, account_id, ifsc_code, is_default FROM payment_methods WHERE user_id = ?",
      [id]
    );
    user.payment_methods = paymentMethods;

    // Get recent files
    const [files] = await pool.query(
      "SELECT id, original_name, mime_type, size_bytes, view_count, status, created_at FROM files WHERE user_id = ? ORDER BY created_at DESC LIMIT 10",
      [id]
    );
    user.recent_files = files;

    // Get payouts
    const [payouts] = await pool.query(
      "SELECT id, amount, method, status, requested_at, processed_at FROM payouts WHERE user_id = ? ORDER BY requested_at DESC LIMIT 10",
      [id]
    );
    user.payouts = payouts;

    // Get referral info
    const [[{ referral_count }]] = await pool.query(
      "SELECT COUNT(*) AS referral_count FROM users WHERE referred_by = ?",
      [id]
    );
    user.referral_count = parseInt(referral_count) || 0;

    // Get referrer name
    if (user.referred_by) {
      const [refRows] = await pool.query("SELECT name, email FROM users WHERE id = ?", [user.referred_by]);
      user.referrer = refRows.length ? refRows[0] : null;
    }

    // Calculate earnings
    let earningRate = 5.0;
    try {
      const [[rateSetting]] = await pool.query("SELECT value FROM app_settings WHERE id = 'earning_rate'");
      if (rateSetting) earningRate = parseFloat(rateSetting.value);
    } catch {}
    user.total_earnings = parseFloat((parseInt(user.total_views) * earningRate / 1000).toFixed(4));

    // Payout totals
    const [[payoutTotals]] = await pool.query(
      `SELECT
        COALESCE(SUM(CASE WHEN status='completed' THEN amount ELSE 0 END), 0) AS total_paid,
        COALESCE(SUM(CASE WHEN status='pending' THEN amount ELSE 0 END), 0) AS pending_amount
       FROM payouts WHERE user_id = ?`,
      [id]
    );
    user.total_paid = parseFloat(payoutTotals.total_paid) || 0;
    user.pending_amount = parseFloat(payoutTotals.pending_amount) || 0;
    user.available_balance = Math.max(0, user.total_earnings - user.total_paid - user.pending_amount);

    res.json({ success: true, data: { user } });
  } catch (err) { next(err); }
}


// ── GET /api/admin/tickets ───────────────────────────────────────────────────
export async function getTickets(req, res, next) {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 20);
    const offset = (page - 1) * limit;
    const status = req.query.status || "";

    let whereClause = "1=1";
    const params = [];
    if (status && ["pending", "open", "resolved", "closed"].includes(status)) {
      whereClause += " AND t.status = ?";
      params.push(status);
    }

    const [rows] = await pool.query(
      `SELECT t.id, t.subject, t.message, t.status, t.admin_reply, t.replied_at, t.created_at,
              u.name AS user_name, u.email AS user_email
       FROM tickets t
       JOIN users u ON u.id = t.user_id
       WHERE ${whereClause}
       ORDER BY t.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total FROM tickets t WHERE ${whereClause}`, params
    );

    res.json({ success: true, data: { tickets: rows, pagination: { page, limit, total: parseInt(total), pages: Math.ceil(total / limit) } } });
  } catch (err) { next(err); }
}

// ── PATCH /api/admin/tickets/:id ─────────────────────────────────────────────
export async function replyTicket(req, res, next) {
  try {
    const { id } = req.params;
    const { status, admin_reply } = req.body;

    const updates = [];
    const values = [];

    if (status && ["pending", "open", "resolved", "closed"].includes(status)) {
      updates.push("status = ?");
      values.push(status);
    }
    if (admin_reply !== undefined && admin_reply.trim()) {
      updates.push("admin_reply = ?");
      values.push(admin_reply.trim());
      updates.push("replied_at = NOW()");

      // Also add to ticket_replies for conversation
      const { v4: uuidv4 } = await import("uuid");
      await pool.query(
        "INSERT INTO ticket_replies (id, ticket_id, sender, message) VALUES (?, ?, 'admin', ?)",
        [uuidv4(), id, admin_reply.trim()]
      );
    }

    if (!updates.length) return res.status(400).json({ success: false, message: "Nothing to update." });

    values.push(id);
    await pool.query(`UPDATE tickets SET ${updates.join(", ")} WHERE id = ?`, values);

    // Auto-notify user about ticket reply
    if (admin_reply && admin_reply.trim()) {
      const [[ticket]] = await pool.query("SELECT user_id, subject FROM tickets WHERE id = ?", [id]);
      if (ticket) {
        const { createNotification } = await import("./admin.controller.js");
        await createNotification(ticket.user_id, "Ticket Reply", `Admin replied to your ticket: "${ticket.subject}"`, "ticket");
        // Send email
        const [[userData]] = await pool.query("SELECT name, email FROM users WHERE id = ?", [ticket.user_id]);
        if (userData) {
          const { sendEmail, ticketReplyEmail } = await import("../utils/mailer.js");
          sendEmail(userData.email, `Vidora — Reply to: ${ticket.subject}`, ticketReplyEmail(userData.name, ticket.subject, admin_reply.trim())).catch(() => {});
        }
      }
    }

    res.json({ success: true, message: "Ticket updated." });
  } catch (err) { next(err); }
}

// ── GET /api/admin/tickets/:id/replies ───────────────────────────────────────
export async function getTicketReplies(req, res, next) {
  try {
    const { id } = req.params;
    const [replies] = await pool.query(
      "SELECT id, sender, message, created_at FROM ticket_replies WHERE ticket_id = ? ORDER BY created_at ASC",
      [id]
    );
    res.json({ success: true, data: { replies } });
  } catch (err) { next(err); }
}


// ── POST /api/admin/notifications — Send notification to user ────────────────
export async function sendNotification(req, res, next) {
  try {
    const { user_id, title, message, type } = req.body;
    if (!user_id || !title || !message) {
      return res.status(400).json({ success: false, message: "user_id, title, and message required." });
    }

    const { v4: uuidv4 } = await import("uuid");
    await pool.query(
      "INSERT INTO notifications (id, user_id, title, message, type) VALUES (?, ?, ?, ?, ?)",
      [uuidv4(), user_id, title.trim(), message.trim(), type || "custom"]
    );

    res.json({ success: true, message: "Notification sent." });
  } catch (err) { next(err); }
}

// ── Helper: create notification (used internally) ────────────────────────────
export async function createNotification(userId, title, message, type = "system") {
  try {
    const { v4: uuidv4 } = await import("uuid");
    await pool.query(
      "INSERT INTO notifications (id, user_id, title, message, type) VALUES (?, ?, ?, ?, ?)",
      [uuidv4(), userId, title, message, type]
    );
  } catch {}
}


// ── POST /api/admin/notifications/broadcast — Send to ALL users ──────────────
export async function broadcastNotification(req, res, next) {
  try {
    const { title, message } = req.body;
    if (!title || !message) {
      return res.status(400).json({ success: false, message: "Title and message required." });
    }

    const { v4: uuidv4 } = await import("uuid");
    const [users] = await pool.query("SELECT id FROM users WHERE is_active = 1");

    for (const user of users) {
      await pool.query(
        "INSERT INTO notifications (id, user_id, title, message, type) VALUES (?, ?, ?, ?, 'system')",
        [uuidv4(), user.id, title.trim(), message.trim()]
      );
    }

    res.json({ success: true, message: `Broadcast sent to ${users.length} users.` });
  } catch (err) { next(err); }
}


// ── POST /api/admin/files/:id/notify — Send push notification for a file ─────
export async function notifyFileToAll(req, res, next) {
  try {
    const { id } = req.params;

    // Get file info
    const [files] = await pool.query(
      "SELECT id, original_name, mime_type, thumbnail_url FROM files WHERE id = ? AND status = 'active'",
      [id]
    );
    if (!files.length) return res.status(404).json({ success: false, message: "File not found." });

    const file = files[0];
    const title = "New on Vidora";
    const body = file.original_name.replace(/\.[^.]+$/, "");

    // Get all FCM tokens (deduplicated)
    const [users] = await pool.query("SELECT DISTINCT fcm_token FROM users WHERE fcm_token IS NOT NULL AND is_active = 1");
    const tokens = users.map(u => u.fcm_token).filter(Boolean);

    // Send push notification
    const { sendPushNotification } = await import("../utils/firebase.js");
    const thumbnailUrl = file.thumbnail_url ? `${process.env.BASE_URL || `http://localhost:${process.env.PORT || 5001}`}${file.thumbnail_url}` : "";
    const result = await sendPushNotification(tokens, title, body, { file_id: id, type: "file", thumbnail: thumbnailUrl || "" });

    res.json({ success: true, message: `Push sent to ${result.success} devices.`, data: result });
  } catch (err) { next(err); }
}


// ── GET /api/admin/subscriptions/stats ────────────────────────────────────────
export async function getSubscriptionStats(req, res, next) {
  try {
    const [[{ premium_count }]] = await pool.query("SELECT COUNT(*) AS premium_count FROM users WHERE is_premium = 1");
    res.json({ success: true, data: { premium_count: parseInt(premium_count) } });
  } catch (err) { next(err); }
}

// ── PATCH /api/admin/subscriptions/:userId ────────────────────────────────────
export async function toggleUserPremium(req, res, next) {
  try {
    const { userId } = req.params;
    const { is_premium } = req.body;
    await pool.query("UPDATE users SET is_premium = ? WHERE id = ?", [is_premium ? 1 : 0, userId]);
    res.json({ success: true, message: is_premium ? "Premium granted." : "Premium removed." });
  } catch (err) { next(err); }
}

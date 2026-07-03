import nodemailer from "nodemailer";
import pool from "../db/connection.js";

/**
 * Get SMTP config from app_settings (admin configurable)
 */
async function getSmtpConfig() {
  const [rows] = await pool.query(
    "SELECT id, value FROM app_settings WHERE id IN ('smtp_host','smtp_port','smtp_user','smtp_pass','smtp_from')"
  );
  const config = {};
  rows.forEach(r => { config[r.id] = r.value; });
  return config;
}

/**
 * Base email template — dark theme with Vidora branding
 */
function emailTemplate(title, content) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#06070d;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:480px;margin:0 auto;padding:40px 20px;">
    <!-- Logo -->
    <div style="text-align:center;margin-bottom:32px;">
      <span style="font-size:24px;font-weight:800;color:#fff;letter-spacing:-0.5px;">Vidora</span>
    </div>
    <!-- Card -->
    <div style="background:#0E0E1A;border-radius:16px;border:1px solid rgba(167,139,250,0.2);padding:32px;box-shadow:0 0 40px rgba(124,58,237,0.08);">
      <h2 style="color:#fff;margin:0 0 8px;font-size:20px;">${title}</h2>
      ${content}
    </div>
    <!-- Footer -->
    <div style="text-align:center;margin-top:24px;">
      <p style="color:#475569;font-size:11px;margin:0;">© ${new Date().getFullYear()} Vidora. All rights reserved.</p>
      <p style="color:#475569;font-size:11px;margin:4px 0 0;">You received this because you have a Vidora account.</p>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Send email using SMTP settings from database
 */
export async function sendEmail(to, subject, html) {
  const config = await getSmtpConfig();

  if (!config.smtp_host || !config.smtp_user || !config.smtp_pass) {
    console.warn("⚠️  SMTP not configured. Email not sent.");
    return false;
  }

  const transporter = nodemailer.createTransport({
    host: config.smtp_host,
    port: parseInt(config.smtp_port) || 587,
    secure: parseInt(config.smtp_port) === 465,
    auth: {
      user: config.smtp_user,
      pass: config.smtp_pass,
    },
  });

  try {
    await transporter.sendMail({
      from: config.smtp_from || config.smtp_user,
      to,
      subject,
      html,
    });
    console.log(`📧 Email sent to ${to}: ${subject}`);
    return true;
  } catch (err) {
    console.error("❌ Email send failed:", err.message);
    return false;
  }
}

// ── Email Templates ──────────────────────────────────────────────────────────

// --- Welcome Email Template

export function welcomeEmail(name) {
  return emailTemplate("Welcome to Vidora! 🎉", `
    <!-- GREETING -->
    <p style="color:#c4b5fd;font-size:15px;margin:0 0 6px;font-weight:600;">
      Hi <strong style="color:#ffffff;">${name}</strong> 👋
    </p>
    <p style="color:#7c6b9a;font-size:14px;margin:0 0 24px;line-height:1.7;">
      We're excited to have you on board. Vidora gives you the tools to upload 
      your content, share it with the world, and earn real money from every view.
    </p>

    <!-- STATS ROW -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      <tr>
        <td style="width:33%;padding:0 4px 0 0;">
          <div style="background:rgba(124,58,237,0.1);border:1px solid rgba(124,58,237,0.2);
                      border-radius:10px;padding:14px;text-align:center;">
            <div style="font-size:20px;font-weight:700;color:#a78bfa;margin-bottom:2px;">$5</div>
            <div style="font-size:11px;color:#5a4a7a;letter-spacing:.04em;">per 1000 views</div>
          </div>
        </td>
        <td style="width:33%;padding:0 4px;">
          <div style="background:rgba(124,58,237,0.1);border:1px solid rgba(124,58,237,0.2);
                      border-radius:10px;padding:14px;text-align:center;">
            <div style="font-size:20px;font-weight:700;color:#a78bfa;margin-bottom:2px;">5%</div>
            <div style="font-size:11px;color:#5a4a7a;letter-spacing:.04em;">referral bonus</div>
          </div>
        </td>
        <td style="width:33%;padding:0 0 0 4px;">
          <div style="background:rgba(124,58,237,0.1);border:1px solid rgba(124,58,237,0.2);
                      border-radius:10px;padding:14px;text-align:center;">
            <div style="font-size:20px;font-weight:700;color:#a78bfa;margin-bottom:2px;">∞</div>
            <div style="font-size:11px;color:#5a4a7a;letter-spacing:.04em;">upload limit</div>
          </div>
        </td>
      </tr>
    </table>

    <!-- FEATURES -->
    <p style="color:#7c6b9a;font-size:11px;font-weight:600;letter-spacing:.08em;
              text-transform:uppercase;margin:0 0 14px;">What you can do</p>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:12px;">
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.05);">
          <span style="color:#a78bfa;font-size:16px;margin-right:10px;">↑</span>
          <strong style="color:#e2d9f3;font-size:14px;">Upload & earn from views</strong>
          <br>
          <span style="color:#5a4a7a;font-size:12px;padding-left:26px;line-height:1.6;">
            Upload any video or file — earn $5 per 1,000 views automatically.
          </span>
        </td>
      </tr>
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.05);">
          <span style="color:#a78bfa;font-size:16px;margin-right:10px;">⇗</span>
          <strong style="color:#e2d9f3;font-size:14px;">Share links & grow your audience</strong>
          <br>
          <span style="color:#5a4a7a;font-size:12px;padding-left:26px;line-height:1.6;">
            Every upload gets a secure shareable link. Share on WhatsApp, Telegram, anywhere.
          </span>
        </td>
      </tr>
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.05);">
          <span style="color:#a78bfa;font-size:16px;margin-right:10px;">₹</span>
          <strong style="color:#e2d9f3;font-size:14px;">Withdraw your earnings</strong>
          <br>
          <span style="color:#5a4a7a;font-size:12px;padding-left:26px;line-height:1.6;">
            UPI, PayPal, or bank transfer. Monthly payouts, no hidden fees.
          </span>
        </td>
      </tr>
      <tr>
        <td style="padding:10px 0;">
          <span style="color:#a78bfa;font-size:16px;margin-right:10px;">+</span>
          <strong style="color:#e2d9f3;font-size:14px;">Refer friends, earn 5% bonus</strong>
          <br>
          <span style="color:#5a4a7a;font-size:12px;padding-left:26px;line-height:1.6;">
            Share your referral link — earn 5% of your friends' earnings forever.
          </span>
        </td>
      </tr>
    </table>

    <!-- CTA -->
    <div style="background:rgba(124,58,237,0.08);border:1px solid rgba(124,58,237,0.2);
                border-radius:12px;padding:22px;text-align:center;margin:24px 0;">
      <p style="color:#8b7aaa;font-size:13px;margin:0 0 16px;line-height:1.6;">
        Your dashboard is ready. Upload your first file and start earning in minutes.
      </p>
      <a href="https://vidora.app/dashboard"
         style="display:inline-block;background:#7c3aed;color:#ffffff;text-decoration:none;
                padding:13px 32px;border-radius:10px;font-size:15px;font-weight:600;">
        Go to dashboard →
      </a>
    </div>

    <!-- HELP STRIP -->
    <div style="background:rgba(124,58,237,0.05);border-radius:10px;
                padding:14px 16px;margin-bottom:0;">
      <p style="color:#c4b5fd;font-size:13px;font-weight:600;margin:0 0 3px;">
        Need help getting started?
      </p>
      <p style="color:#5a4a7a;font-size:12px;margin:0;line-height:1.6;">
        Read our <a href="https://vidora.app/help" style="color:#7c3aed;">help docs</a> 
        or <a href="https://vidora.app/contact" style="color:#7c3aed;">contact support</a> 
        — we reply within 24 hours.
      </p>
    </div>
  `);
}


// --- password resate email template

export function passwordResetEmail(name, otp) {
  const digits = String(otp).split('').map(d => `
    <td style="padding:0 3px;">
      <div style="width:48px;height:58px;background:rgba(124,58,237,0.12);
                  border:1.5px solid rgba(124,58,237,0.35);border-radius:10px;
                  display:inline-block;text-align:center;line-height:58px;
                  font-size:28px;font-weight:700;color:#ffffff;font-family:monospace;">
        ${d}
      </div>
    </td>`).join('');

  return emailTemplate("Password Reset — Vidora", `

    <p style="color:#c4b5fd;font-size:15px;margin:0 0 4px;font-weight:600;">
      Hi <strong style="color:#ffffff;">${name}</strong>,
    </p>
    <p style="color:#7c6b9a;font-size:14px;margin:0 0 24px;line-height:1.7;">
      Use the verification code below to reset your Vidora password.
      This code is valid for <strong style="color:#e2d9f3;">15 minutes</strong> only.
    </p>

    <!-- OTP BOX -->
    <div style="background:rgba(124,58,237,0.07);border:1px solid rgba(124,58,237,0.2);
                border-radius:14px;padding:26px 20px;text-align:center;margin-bottom:22px;">
      <p style="color:#7c6b9a;font-size:11px;font-weight:600;letter-spacing:.09em;
                text-transform:uppercase;margin:0 0 16px;">
        Your verification code
      </p>
      <table cellpadding="0" cellspacing="0" style="margin:0 auto 16px;">
        <tr>${digits}</tr>
      </table>
      <p style="color:#5a4a7a;font-size:12px;margin:0;">
        Expires in <strong style="color:#a78bfa;">15 minutes</strong>
      </p>
    </div>

    <!-- STEPS -->
    <p style="color:#7c6b9a;font-size:11px;font-weight:600;letter-spacing:.08em;
              text-transform:uppercase;margin:0 0 14px;">How to use</p>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:22px;">
      <tr>
        <td style="padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.05);">
          <span style="display:inline-block;width:22px;height:22px;background:rgba(124,58,237,0.2);
                       border-radius:50%;text-align:center;line-height:22px;
                       font-size:11px;font-weight:600;color:#a78bfa;margin-right:10px;">1</span>
          <span style="color:#8b7aaa;font-size:13px;">
            Open <a href="https://vidora.app/forgot-password" 
                    style="color:#7c3aed;text-decoration:none;">vidora.app/forgot-password</a>
          </span>
        </td>
      </tr>
      <tr>
        <td style="padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.05);">
          <span style="display:inline-block;width:22px;height:22px;background:rgba(124,58,237,0.2);
                       border-radius:50%;text-align:center;line-height:22px;
                       font-size:11px;font-weight:600;color:#a78bfa;margin-right:10px;">2</span>
          <span style="color:#8b7aaa;font-size:13px;">Enter the 6-digit code above</span>
        </td>
      </tr>
      <tr>
        <td style="padding:8px 0;">
          <span style="display:inline-block;width:22px;height:22px;background:rgba(124,58,237,0.2);
                       border-radius:50%;text-align:center;line-height:22px;
                       font-size:11px;font-weight:600;color:#a78bfa;margin-right:10px;">3</span>
          <span style="color:#8b7aaa;font-size:13px;">Set your new password</span>
        </td>
      </tr>
    </table>

    <!-- SECURITY WARNING -->
    <div style="background:rgba(220,38,38,0.07);border:1px solid rgba(220,38,38,0.2);
                border-radius:12px;padding:14px 16px;margin-bottom:22px;">
      <p style="color:#f87171;font-size:13px;font-weight:600;margin:0 0 4px;">
        ⚠ Didn't request this?
      </p>
      <p style="color:#7a3a3a;font-size:12px;margin:0;line-height:1.6;">
        Ignore this email — your account is safe and no changes have been made.
        If this keeps happening,
        <a href="https://vidora.app/contact" style="color:#f87171;text-decoration:none;">
          contact support</a>.
      </p>
    </div>

    <!-- HELP -->
    <div style="background:rgba(124,58,237,0.05);border-radius:10px;padding:14px 16px;">
      <p style="color:#5a4a7a;font-size:12px;margin:0;line-height:1.6;">
        Still having trouble?
        <a href="https://vidora.app/contact" style="color:#7c3aed;text-decoration:none;">
          Contact our support team</a> — we reply within 24 hours.
      </p>
    </div>
  `);
}

// --- payout complete template

export function payoutCompletedEmail(name, amount, method, txnId = null) {
  const formattedAmount = parseFloat(amount).toFixed(2);
  const txnDisplay = txnId ? `TXN#${txnId}` : `TXN#${Date.now().toString().slice(-6)}`;
  const dateStr = new Date().toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric'
  });

  return emailTemplate("Payout Completed ✓ — Vidora", `

    <p style="color:#c4b5fd;font-size:15px;margin:0 0 4px;font-weight:600;">
      Hi <strong style="color:#ffffff;">${name}</strong> 🎉
    </p>
    <p style="color:#7c6b9a;font-size:14px;margin:0 0 22px;line-height:1.7;">
      Great news! Your withdrawal request has been processed and the 
      funds are on their way to your account.
    </p>

    <!-- AMOUNT CARD -->
    <div style="background:rgba(16,185,129,0.07);border:1px solid rgba(16,185,129,0.22);
                border-radius:14px;padding:24px 20px;text-align:center;margin-bottom:20px;">
      <p style="color:#6b9a80;font-size:11px;font-weight:600;letter-spacing:.09em;
                text-transform:uppercase;margin:0 0 10px;">Amount paid</p>
      <p style="color:#ffffff;font-size:40px;font-weight:700;margin:0 0 4px;letter-spacing:-1px;">
        $${formattedAmount}
      </p>
      <div style="display:inline-block;background:rgba(16,185,129,0.12);
                  border:1px solid rgba(16,185,129,0.2);border-radius:20px;
                  padding:4px 14px;margin-top:8px;">
        <span style="color:#34d399;font-size:12px;font-weight:600;">via ${method}</span>
      </div>
    </div>

    <!-- STATS ROW -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:22px;">
      <tr>
        <td style="width:33%;padding:0 4px 0 0;">
          <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);
                      border-radius:10px;padding:12px;text-align:center;">
            <p style="color:#5a4a7a;font-size:10px;letter-spacing:.06em;
                      text-transform:uppercase;margin:0 0 4px;">Transaction</p>
            <p style="color:#e2d9f3;font-size:12px;font-weight:600;
                      margin:0;font-family:monospace;">${txnDisplay}</p>
          </div>
        </td>
        <td style="width:33%;padding:0 4px;">
          <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);
                      border-radius:10px;padding:12px;text-align:center;">
            <p style="color:#5a4a7a;font-size:10px;letter-spacing:.06em;
                      text-transform:uppercase;margin:0 0 4px;">Date</p>
            <p style="color:#e2d9f3;font-size:12px;font-weight:600;margin:0;">${dateStr}</p>
          </div>
        </td>
        <td style="width:33%;padding:0 0 0 4px;">
          <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);
                      border-radius:10px;padding:12px;text-align:center;">
            <p style="color:#5a4a7a;font-size:10px;letter-spacing:.06em;
                      text-transform:uppercase;margin:0 0 4px;">Arrival</p>
            <p style="color:#e2d9f3;font-size:12px;font-weight:600;margin:0;">1–3 days</p>
          </div>
        </td>
      </tr>
    </table>

    <!-- TIMELINE -->
    <p style="color:#7c6b9a;font-size:11px;font-weight:600;letter-spacing:.08em;
              text-transform:uppercase;margin:0 0 14px;">Transfer status</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:22px;">
      <tr>
        <td style="width:22px;vertical-align:top;padding-top:2px;">
          <div style="width:12px;height:12px;border-radius:50%;background:#34d399;"></div>
        </td>
        <td style="padding:0 0 16px 12px;border-bottom:0;">
          <p style="color:#e2d9f3;font-size:13px;font-weight:600;margin:0 0 2px;">Payout initiated</p>
          <p style="color:#5a4a7a;font-size:12px;margin:0;">Withdrawal request approved by Vidora</p>
        </td>
      </tr>
      <tr>
        <td style="width:22px;vertical-align:top;padding-top:2px;">
          <div style="width:12px;height:12px;border-radius:50%;background:#34d399;"></div>
        </td>
        <td style="padding:0 0 16px 12px;">
          <p style="color:#e2d9f3;font-size:13px;font-weight:600;margin:0 0 2px;">Payment processed</p>
          <p style="color:#5a4a7a;font-size:12px;margin:0;">Funds sent via ${method}</p>
        </td>
      </tr>
      <tr>
        <td style="width:22px;vertical-align:top;padding-top:2px;">
          <div style="width:12px;height:12px;border-radius:50%;
                      background:rgba(16,185,129,0.25);
                      border:1.5px solid rgba(16,185,129,0.4);"></div>
        </td>
        <td style="padding:0 0 0 12px;">
          <p style="color:#6b9a80;font-size:13px;font-weight:600;margin:0 0 2px;">
            Arriving in your account
          </p>
          <p style="color:#5a4a7a;font-size:12px;margin:0;">
            Expected within 1–3 business days
          </p>
        </td>
      </tr>
    </table>

    <!-- INFO -->
    <div style="background:rgba(124,58,237,0.07);border:1px solid rgba(124,58,237,0.18);
                border-radius:12px;padding:14px 16px;margin-bottom:22px;">
      <p style="color:#c4b5fd;font-size:13px;font-weight:600;margin:0 0 3px;">
        ℹ Bank transfers may take longer
      </p>
      <p style="color:#5a4a7a;font-size:12px;margin:0;line-height:1.6;">
        UPI transfers usually arrive within minutes. Bank or PayPal transfers 
        may take up to 3 business days depending on your provider.
      </p>
    </div>

    <!-- CTA -->
    <div style="text-align:center;margin-bottom:22px;">
      <a href="https://vidora.app/dashboard/earnings"
         style="display:inline-block;background:#7c3aed;color:#ffffff;
                text-decoration:none;padding:12px 28px;border-radius:10px;
                font-size:14px;font-weight:600;">
        View earnings dashboard →
      </a>
    </div>

    <!-- HELP -->
    <div style="background:rgba(124,58,237,0.05);border-radius:10px;padding:14px 16px;">
      <p style="color:#5a4a7a;font-size:12px;margin:0;line-height:1.6;">
        Funds not arrived after 3 days? 
        <a href="https://vidora.app/contact" style="color:#7c3aed;text-decoration:none;">
          Contact support</a> with your transaction ID 
        <strong style="color:#8b7aaa;">${txnDisplay}</strong>.
      </p>
    </div>
  `);
}

export function payoutFailedEmail(name, amount, reason) {
  return emailTemplate("Payout Failed", `
    <p style="color:#94a3b8;font-size:14px;margin:0 0 20px;">Hi <strong style="color:#fff;">${name}</strong>, unfortunately your payout was not processed.</p>
    <div style="background:rgba(239,68,68,0.08);border-radius:12px;padding:16px;margin-bottom:20px;border:1px solid rgba(239,68,68,0.2);">
      <p style="color:#f87171;font-size:13px;margin:0 0 4px;font-weight:600;">Amount: $${parseFloat(amount).toFixed(2)}</p>
      <p style="color:#94a3b8;font-size:13px;margin:0;">Reason: ${reason || "Please check your payment details."}</p>
    </div>
    <p style="color:#64748b;font-size:12px;margin:0;">Please update your payment method in Settings and try again.</p>
  `);
}

export function ticketReplyEmail(name, subject, reply) {
  return emailTemplate("Ticket Reply", `
    <p style="color:#94a3b8;font-size:14px;margin:0 0 20px;">Hi <strong style="color:#fff;">${name}</strong>, we replied to your ticket.</p>
    <div style="background:rgba(167,139,250,0.08);border-radius:12px;padding:16px;margin-bottom:20px;border:1px solid rgba(167,139,250,0.15);">
      <p style="color:#a78bfa;font-size:12px;margin:0 0 8px;font-weight:600;">${subject}</p>
      <p style="color:#e2e8f0;font-size:13px;margin:0;">${reply}</p>
    </div>
    <p style="color:#64748b;font-size:12px;margin:0;">Log in to your dashboard to continue the conversation.</p>
  `);
}


export function verificationEmail(name, verifyUrl) {
  return emailTemplate("Verify Your Email", `
    <p style="color:#94a3b8;font-size:14px;margin:0 0 20px;">Hi <strong style="color:#fff;">${name}</strong>, please verify your email to unlock all features.</p>
    <div style="text-align:center;margin-bottom:24px;">
      <a href="${verifyUrl}" style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#a78bfa);color:#fff;font-weight:bold;font-size:14px;padding:14px 32px;border-radius:12px;text-decoration:none;">Verify Email</a>
    </div>
    <p style="color:#64748b;font-size:12px;margin:0 0 8px;">Or copy this link:</p>
    <p style="color:#94a3b8;font-size:11px;word-break:break-all;margin:0;background:#1a1a2e;padding:10px;border-radius:8px;">${verifyUrl}</p>
    <p style="color:#475569;font-size:11px;margin:16px 0 0;">This link expires in 24 hours.</p>
  `);
}

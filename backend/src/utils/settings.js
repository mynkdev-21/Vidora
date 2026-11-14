/**
 * app_settings access rules.
 *
 * The table mixes public configuration (social links, ad unit IDs) with
 * credentials (SMTP password, storage keys). Public endpoints may only expose
 * keys on the explicit allowlist below; adding a new key is opt-in. Admin
 * endpoints receive secrets masked, and a masked value sent back unchanged is
 * ignored so saving a form never overwrites a stored credential.
 */
import pool from "../db/connection.js";

/** Keys the web dashboard and Android app read from GET /api/settings. */
export const PUBLIC_SETTING_KEYS = Object.freeze([
  "admob_app_id",
  "admob_banner_id",
  "admob_interstitial_id",
  "admob_rewarded_id",
  "ads_enabled",
  "community_url",
  "dashboard_url",
  "earning_rate",
  "forgot_password_url",
  "help_url",
  "instagram_url",
  "min_payout",
  "privacy_url",
  "referral_bonus",
  "sub_monthly_price",
  "sub_monthly_trial",
  "sub_yearly_price",
  "sub_yearly_trial",
  "support_email",
  "telegram_channel_url",
  "telegram_url",
  "terms_url",
  "website_url",
  "youtube_url",
]);

const SECRET_KEY_PATTERN = /(secret|pass(word)?|access_key|app_key|api_key|key_id|smtp_user)$/i;
export const MASK_PREFIX = "••••••••";

export function isSecretSetting(key) {
  return SECRET_KEY_PATTERN.test(key);
}

/** "abcd1234wxyz" → "••••••••wxyz"; empty stays empty so the UI can show "not set". */
export function maskValue(value) {
  if (!value) return value;
  const s = String(value);
  return MASK_PREFIX + (s.length > 8 ? s.slice(-4) : "");
}

export function isMaskedValue(value) {
  return typeof value === "string" && value.startsWith(MASK_PREFIX);
}

/** Masks secret keys in an array of { id, value } rows or an { id: value } object. */
export function maskSettingRows(rows) {
  return rows.map((r) => (isSecretSetting(r.id) ? { ...r, value: maskValue(r.value) } : r));
}

export function maskSettingMap(map) {
  return Object.fromEntries(Object.entries(map).map(([k, v]) => [k, isSecretSetting(k) ? maskValue(v) : v]));
}

/** Entries the caller actually changed: drops masked placeholders sent back by the UI. */
export function changedSettingEntries(settings) {
  return Object.entries(settings).filter(([, value]) => !isMaskedValue(value));
}

export async function getPublicSettings() {
  const [rows] = await pool.query("SELECT id, value FROM app_settings WHERE id IN (?)", [PUBLIC_SETTING_KEYS]);
  return Object.fromEntries(rows.map((r) => [r.id, r.value]));
}

export async function getSetting(id, fallback = null, conn = pool) {
  const [rows] = await conn.query("SELECT value FROM app_settings WHERE id = ?", [id]);
  return rows.length ? rows[0].value : fallback;
}

export async function getNumericSetting(id, fallback, conn = pool) {
  const n = parseFloat(await getSetting(id, null, conn));
  return Number.isFinite(n) ? n : fallback;
}

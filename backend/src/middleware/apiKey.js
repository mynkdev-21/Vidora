/**
 * Client API keys.
 *
 * The web and mobile keys ship inside the browser bundle and the APK, so they
 * are PUBLIC CLIENT IDENTIFIERS, not secrets. They label traffic and let a
 * leaked/abused client be cut off by rotating its key; they must never be the
 * only thing protecting an endpoint. Authorization comes from JWTs (users),
 * admin JWTs (admins), per-user keys (Telegram bot) and rate limits.
 *
 * Request headers such as Origin and Referer are attacker-controlled outside a
 * browser and are never used to skip this check. Keys are accepted only in the
 * X-API-Key header (never the query string, which ends up in access logs).
 */
import { config } from "../config.js";

if (config.apiKeys.size === 0 && !config.isTest) {
  console.warn("⚠️  WARNING: No API_KEYS configured — every /api request will be rejected.");
}

export function requireApiKey(req, res, next) {
  const key = req.get("x-api-key");
  if (!key) {
    return res.status(401).json({
      success: false,
      message: "API key required. Pass it via the X-API-Key header.",
    });
  }

  const label = config.apiKeys.get(key);
  if (!label) {
    return res.status(403).json({ success: false, message: "Invalid API key." });
  }

  req.apiKeyLabel = label;
  next();
}

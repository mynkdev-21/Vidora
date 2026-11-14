/**
 * Central runtime configuration.
 *
 * Every security-relevant setting is read here once, so it can be validated
 * before the server starts accepting traffic. Values are never logged.
 */
import "dotenv/config";
import path from "path";

const env = process.env;

const NODE_ENV = env.NODE_ENV || "development";
const isProduction = NODE_ENV === "production";

/**
 * TRUST_PROXY follows Express semantics:
 *   unset / "false"  → don't trust X-Forwarded-For (direct exposure)
 *   "true"           → trust everything (only when ALWAYS behind a proxy)
 *   "1", "2"         → number of proxy hops to trust
 *   "loopback", "10.0.0.0/8,…" → named / CIDR list of trusted proxies
 */
function parseTrustProxy(raw) {
  if (raw === undefined || raw === "" || raw === "false") return false;
  if (raw === "true") return true;
  if (/^\d+$/.test(raw)) return Number(raw);
  return raw.split(",").map((s) => s.trim()).filter(Boolean);
}

/** API_KEYS="key1:web,key2:mobile,key3:bot" → Map(key → label) */
function parseApiKeys(raw = "") {
  const map = new Map();
  for (const entry of raw.split(",")) {
    const [key, label = "unknown"] = entry.trim().split(":");
    if (key && key.trim()) map.set(key.trim(), label.trim());
  }
  return map;
}

function parseList(raw, fallback = []) {
  if (!raw) return fallback;
  return raw.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
}

const port = Number(env.PORT) || 5000;

export const config = {
  env: NODE_ENV,
  isProduction,
  isTest: NODE_ENV === "test",
  port,

  baseUrl: env.BASE_URL || `http://localhost:${port}`,
  shareUrl: env.SHARE_URL || env.BASE_URL || `http://localhost:${port}`,
  frontendUrl: env.FRONTEND_URL || "http://localhost:8080",
  corsOrigins: parseList(env.FRONTEND_ORIGINS, [
    (env.FRONTEND_URL || "http://localhost:3000").toLowerCase(),
    "http://localhost:5173",
    "http://localhost:4173",
    "http://localhost:8080",
    "http://localhost:8081",
    "http://127.0.0.1:8080",
  ]),

  trustProxy: parseTrustProxy(env.TRUST_PROXY),

  jwt: {
    secret: env.JWT_SECRET,
    refreshSecret: env.JWT_REFRESH_SECRET,
    expiresIn: env.JWT_EXPIRES_IN || "7d",
    refreshExpiresIn: env.JWT_REFRESH_EXPIRES_IN || "30d",
  },

  /** Client identifiers (NOT secrets — they ship inside the apps). */
  apiKeys: parseApiKeys(env.API_KEYS),

  uploadsDir: path.resolve(env.UPLOADS_DIR || "uploads"),
  maxUploadBytes: Number(env.MAX_UPLOAD_BYTES) || 10 * 1024 * 1024 * 1024, // 10 GB
  maxImageUploadBytes: 5 * 1024 * 1024,

  telegramBotToken: env.TELEGRAM_BOT_TOKEN || "",
};

// ── Validation ────────────────────────────────────────────────────────────────

// A generated secret (`openssl rand -hex 48`) never contains these words.
const PLACEHOLDER = /change[-_ ]?(me|this)|your[-_ ]|example|placeholder|secret|password/i;
const MIN_SECRET_LENGTH = 32;

function checkSecret(name, value, errors) {
  if (!value) return errors.push(`${name} is not set.`);
  if (value.length < MIN_SECRET_LENGTH) errors.push(`${name} must be at least ${MIN_SECRET_LENGTH} characters.`);
  if (PLACEHOLDER.test(value)) errors.push(`${name} looks like a placeholder value; generate a random secret (e.g. \`openssl rand -hex 48\`).`);
}

/**
 * Returns { errors, warnings }. In production, any error must stop startup.
 * Messages name the setting but never include its value.
 */
export function validateConfig(cfg = config) {
  const errors = [];
  const warnings = [];

  if (!cfg.jwt.secret) errors.push("JWT_SECRET is not set.");
  if (!cfg.jwt.refreshSecret) errors.push("JWT_REFRESH_SECRET is not set.");
  if (cfg.jwt.secret && cfg.jwt.secret === cfg.jwt.refreshSecret) {
    errors.push("JWT_SECRET and JWT_REFRESH_SECRET must be different.");
  }
  if (cfg.apiKeys.size === 0) warnings.push("API_KEYS is empty — every /api request will be rejected.");

  if (cfg.isProduction) {
    checkSecret("JWT_SECRET", cfg.jwt.secret, errors);
    checkSecret("JWT_REFRESH_SECRET", cfg.jwt.refreshSecret, errors);
    if (!/^https:\/\//.test(cfg.frontendUrl)) errors.push("FRONTEND_URL must use https:// in production.");
    if (!/^https:\/\//.test(cfg.baseUrl)) errors.push("BASE_URL must use https:// in production.");
    if (cfg.trustProxy === false) {
      warnings.push("TRUST_PROXY is not set. If the API runs behind a reverse proxy or load balancer, set it, or rate limits and view de-duplication will see the proxy's IP for every client.");
    }
    if (cfg.trustProxy === true) {
      warnings.push("TRUST_PROXY=true trusts any X-Forwarded-For value. Prefer a hop count (e.g. 1) or the proxy's address.");
    }
  }

  return { errors, warnings };
}

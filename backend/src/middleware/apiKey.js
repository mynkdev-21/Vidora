/**
 * API Key middleware
 *
 * Rules:
 * 1. Requests from allowed frontend origins (CORS) with a valid JWT → skip API key
 * 2. All other requests (mobile app, bots, scripts) → require X-API-Key header
 *
 * This ensures the API key is NEVER exposed in browser JavaScript.
 */

// ── Allowed frontend origins (no API key needed if JWT present) ───────────────
const FRONTEND_ORIGINS = (process.env.FRONTEND_ORIGINS || "http://localhost:8080,http://localhost:5173,http://localhost:3000")
  .split(",")
  .map(o => o.trim().toLowerCase());

// ── Parse API keys from env ───────────────────────────────────────────────────
function loadApiKeys() {
  const raw = process.env.API_KEYS || "";
  const map = new Map();

  raw.split(",").forEach((entry) => {
    const [key, label = "unknown"] = entry.trim().split(":");
    if (key) map.set(key.trim(), label.trim());
  });

  if (map.size === 0) {
    console.warn("⚠️  WARNING: No API_KEYS configured.");
  } else {
    console.log(`🔑 API keys loaded: ${[...map.values()].join(", ")}`);
  }

  return map;
}

const API_KEY_MAP = loadApiKeys();

export function requireApiKey(req, res, next) {
  // Always allow health check
  if (req.path === "/health") return next();

  // ── Check if request is from allowed frontend origin ────────────────────────
  const origin  = (req.headers.origin || "").toLowerCase();
  const referer = (req.headers.referer || "").toLowerCase();

  const isFromFrontend = FRONTEND_ORIGINS.some(o =>
    origin === o || referer.startsWith(o)
  );

  if (isFromFrontend) {
    // Frontend requests are allowed without API key
    // They still need JWT for protected routes (handled by auth middleware)
    req.apiKeyLabel = "web";
    return next();
  }

  // ── For non-frontend requests, require API key ──────────────────────────────
  const key = req.headers["x-api-key"] || req.query.api_key;

  if (!key) {
    return res.status(401).json({
      success: false,
      message: "API key required. Pass it via the X-API-Key header.",
    });
  }

  const label = API_KEY_MAP.get(key);
  if (!label) {
    return res.status(403).json({
      success: false,
      message: "Invalid API key.",
    });
  }

  req.apiKeyLabel = label;
  next();
}

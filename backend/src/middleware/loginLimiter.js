/**
 * Brute-force protection for credential endpoints (audit finding F10).
 *
 * Two independent limits, both counting FAILED attempts only:
 *   - per client IP     — stops one machine from guessing many accounts;
 *   - per target email  — stops many machines guessing one account.
 *
 * Counters live in process memory (express-rate-limit's default store). With
 * several API instances, configure a shared store (e.g. Redis) so limits apply
 * across instances.
 */
import rateLimit from "express-rate-limit";

const normalizedEmail = (req) => String(req.body?.email || "").trim().toLowerCase().slice(0, 255);

export function loginLimiters({ scope, perIp, perEmail, windowMs = 15 * 60 * 1000 }) {
  const message = { success: false, message: "Too many failed attempts. Try again in 15 minutes." };
  const common = { windowMs, skipSuccessfulRequests: true, standardHeaders: true, legacyHeaders: false, message };
  return [
    rateLimit({ ...common, limit: perIp, keyGenerator: (req) => `${scope}:ip:${req.ip}` }),
    rateLimit({ ...common, limit: perEmail, keyGenerator: (req) => `${scope}:email:${normalizedEmail(req)}` }),
  ];
}

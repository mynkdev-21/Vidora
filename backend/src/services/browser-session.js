import crypto from "crypto";
import pool from "../db/connection.js";
import { config } from "../config.js";

const SESSION_DAYS = 30;
const TYPES = Object.freeze({
  user: { table: "user_browser_sessions", cookie: "vidora_user_rt", path: "/api/auth" },
  admin: { table: "admin_browser_sessions", cookie: "vidora_admin_rt", path: "/api/admin/auth" },
});
const spec = (type) => TYPES[type];
const digest = (value) => crypto.createHash("sha256").update(value).digest("hex");
const newToken = () => crypto.randomBytes(32).toString("base64url");
const expiry = () => new Date(Date.now() + SESSION_DAYS * 86400_000);

export function browserMode(req) {
  return req.get("X-Session-Mode") === "browser";
}

export function trustedBrowserOrigin(req) {
  const origin = req.get("Origin");
  return typeof origin === "string" && config.corsOrigins.includes(origin.toLowerCase());
}

export function requireTrustedBrowserOrigin(req, res, next) {
  if (!trustedBrowserOrigin(req)) {
    return res.status(403).json({ success: false, message: "Untrusted browser origin." });
  }
  next();
}

export function readBrowserCookie(req, type) {
  const name = spec(type).cookie;
  const matches = String(req.headers.cookie || "").split(";")
    .map((part) => part.trim()).filter((part) => part.startsWith(`${name}=`));
  if (matches.length !== 1) return null;
  const value = matches[0].slice(name.length + 1);
  return /^[A-Za-z0-9_-]{43}$/.test(value) ? value : null;
}

function cookieHeader(type, token, maxAge) {
  const { cookie, path } = spec(type);
  return `${cookie}=${token}; Path=${path}; Max-Age=${maxAge}; HttpOnly; SameSite=Lax${config.isProduction ? "; Secure" : ""}`;
}

export function setBrowserCookie(res, type, token) {
  res.setHeader("Set-Cookie", cookieHeader(type, token, SESSION_DAYS * 86400));
  res.setHeader("Cache-Control", "no-store");
}

export function clearBrowserCookie(res, type) {
  res.setHeader("Set-Cookie", cookieHeader(type, "", 0));
  res.setHeader("Cache-Control", "no-store");
}

export function csrfFor(token) {
  return crypto.createHmac("sha256", config.jwt.refreshSecret)
    .update(`browser-csrf:${token}`).digest("base64url");
}

export function requireBrowserCsrf(req, res, next) {
  const type = req.baseUrl.startsWith("/api/admin") ? "admin" : "user";
  const token = readBrowserCookie(req, type);
  const given = req.get("X-CSRF-Token") || "";
  if (!trustedBrowserOrigin(req) || !token || !/^[A-Za-z0-9_-]{43}$/.test(given) ||
      !crypto.timingSafeEqual(Buffer.from(given), Buffer.from(csrfFor(token)))) {
    return res.status(403).json({ success: false, message: "Invalid browser CSRF proof." });
  }
  next();
}

export async function createBrowserSession(type, principalId, impAdminId = null) {
  const id = crypto.randomUUID();
  const token = newToken();
  await pool.query(
    type === "user"
      ? "INSERT INTO user_browser_sessions (id, principal_id, imp_admin_id, refresh_hash, expires_at) VALUES (?, ?, ?, ?, ?)"
      : "INSERT INTO admin_browser_sessions (id, principal_id, refresh_hash, expires_at) VALUES (?, ?, ?, ?)",
    type === "user" ? [id, principalId, impAdminId, digest(token), expiry()] : [id, principalId, digest(token), expiry()]
  );
  return { id, token };
}

export async function findBrowserSession(type, token) {
  if (!token) return null;
  const [rows] = await pool.query(
    `SELECT id, principal_id FROM ${spec(type).table}
     WHERE refresh_hash = ? AND revoked_at IS NULL AND expires_at > NOW()`,
    [digest(token)]
  );
  return rows[0] || null;
}

export async function rotateBrowserSession(type, token) {
  if (!token) return null;
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [rows] = await conn.query(
      `SELECT id, principal_id${type === "user" ? ", imp_admin_id" : ""} FROM ${spec(type).table}
       WHERE refresh_hash = ? AND revoked_at IS NULL AND expires_at > NOW() FOR UPDATE`,
      [digest(token)]
    );
    if (!rows.length) { await conn.rollback(); return null; }
    const nextToken = newToken();
    await conn.query(
      `UPDATE ${spec(type).table} SET refresh_hash = ?, expires_at = ? WHERE id = ?`,
      [digest(nextToken), expiry(), rows[0].id]
    );
    await conn.commit();
    return { id: rows[0].id, principalId: rows[0].principal_id,
      impAdminId: rows[0].imp_admin_id || null, token: nextToken };
  } catch (err) {
    await conn.rollback().catch(() => {});
    throw err;
  } finally {
    conn.release();
  }
}

export async function revokeBrowserSession(type, token) {
  if (!token) return;
  await pool.query(
    `UPDATE ${spec(type).table} SET revoked_at = NOW() WHERE refresh_hash = ? AND revoked_at IS NULL`,
    [digest(token)]
  );
}

export async function activeBrowserSession(type, id, principalId) {
  const [rows] = await pool.query(
    `SELECT id FROM ${spec(type).table}
     WHERE id = ? AND principal_id = ? AND revoked_at IS NULL AND expires_at > NOW()`,
    [id, principalId]
  );
  return rows.length === 1;
}

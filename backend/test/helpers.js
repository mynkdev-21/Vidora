/**
 * Shared test helpers. Users, admins and files are inserted directly so tests
 * don't depend on (or trip) the auth rate limiters.
 */
import fs from "fs";
import path from "path";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import request from "supertest";
import app from "../src/app.js";
import pool from "../src/db/connection.js";
import { config } from "../src/config.js";

export { app, pool };
export const WEB_KEY = "test_web_key";
export const MOBILE_KEY = "test_mobile_key";

const uid = () => crypto.randomUUID();
const tag = () => crypto.randomBytes(4).toString("hex");

/** supertest agent bound to the app. */
export const http = () => request(app);

/** Adds the web client key (and optional bearer token) to a supertest request. */
export function keyed(req, token) {
  req.set("X-API-Key", WEB_KEY);
  if (token) req.set("Authorization", `Bearer ${token}`);
  return req;
}

export function userToken(user) {
  return jwt.sign({ id: user.id, email: user.email, role: user.role || "creator" }, config.jwt.secret, { expiresIn: "1h" });
}

export async function createUser({ password = "Passw0rd!x", referredBy = null, isActive = 1 } = {}) {
  const user = { id: uid(), name: `User ${tag()}`, email: `u_${tag()}@example.test`, role: "creator", password };
  await pool.query(
    "INSERT INTO users (id, name, email, password_hash, referred_by, is_active) VALUES (?, ?, ?, ?, ?, ?)",
    [user.id, user.name, user.email, await bcrypt.hash(password, 4), referredBy, isActive]
  );
  user.token = userToken(user);
  return user;
}

export async function createAdmin({ password = "AdminPass1!" } = {}) {
  const admin = { id: uid(), email: `a_${tag()}@example.test`, password };
  await pool.query(
    "INSERT INTO admins (id, name, email, password_hash) VALUES (?, 'Admin', ?, ?)",
    [admin.id, admin.email, await bcrypt.hash(password, 4)]
  );
  admin.token = jwt.sign({ id: admin.id, email: admin.email, role: "admin" }, config.jwt.secret, { expiresIn: "1h" });
  return admin;
}

/** Absolute path inside the test uploads directory. */
export function uploadsPath(...parts) {
  return path.join(config.uploadsDir, ...parts);
}

/**
 * Inserts a files row. With `content`, also writes the bytes to
 * <uploads>/<stored_name> so the file can be streamed.
 */
export async function createFile(userId, { storedName, content, mimeType = "video/mp4", viewCount = 0, status = "active", sourceFileId } = {}) {
  const id = uid();
  const stored = storedName ?? `${uid()}.mp4`;
  if (content !== undefined) fs.writeFileSync(uploadsPath(stored), content);
  const cols = ["id", "user_id", "original_name", "stored_name", "mime_type", "size_bytes", "storage_path", "status", "view_count"];
  const vals = [id, userId, `file_${tag()}.mp4`, stored, mimeType, content ? content.length : 0, `uploads/${stored}`, status, viewCount];
  if (sourceFileId !== undefined) { cols.push("source_file_id"); vals.push(sourceFileId); }
  await pool.query(`INSERT INTO files (${cols.join(", ")}) VALUES (${cols.map(() => "?").join(", ")})`, vals);
  return { id, stored_name: stored, user_id: userId };
}

export async function createShareToken(fileId) {
  const token = crypto.randomBytes(12).toString("base64url");
  await pool.query("INSERT INTO share_tokens (id, file_id, token) VALUES (?, ?, ?)", [uid(), fileId, token]);
  return token;
}

export async function setSetting(id, value) {
  await pool.query(
    "INSERT INTO app_settings (id, value) VALUES (?, ?) ON DUPLICATE KEY UPDATE value = VALUES(value)",
    [id, String(value)]
  );
}

export async function one(sql, params = []) {
  const [rows] = await pool.query(sql, params);
  return rows[0];
}

export const closeDb = () => pool.end();

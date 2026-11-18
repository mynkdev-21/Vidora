/**
 * F11 — migrations: clean install, idempotency, tamper detection, and the
 * upgrade path for an existing database (balances must not change).
 * Uses its own throwaway database so the main test DB is untouched.
 */
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import os from "os";
import path from "path";
import crypto from "crypto";
import mysql from "mysql2/promise";
import { runMigrations, listMigrationFiles } from "../../src/db/migrate.js";

const DB = "videora_migrations_test";
const quiet = { log: () => {} };
let root;

before(async () => {
  root = await mysql.createConnection({ host: process.env.DB_HOST || "localhost", user: process.env.DB_USER || "root", password: process.env.DB_PASSWORD || "" });
});
after(async () => {
  await root.query(`DROP DATABASE IF EXISTS \`${DB}\``);
  await root.end();
});

async function freshDb() {
  await root.query(`DROP DATABASE IF EXISTS \`${DB}\``);
  await root.query(`CREATE DATABASE \`${DB}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  return mysql.createConnection({ host: process.env.DB_HOST || "localhost", user: process.env.DB_USER || "root", password: process.env.DB_PASSWORD || "", database: DB });
}

const EXPECTED_TABLES = [
  "admins", "app_settings", "earnings", "email_verifications", "files", "messages", "notifications",
  "password_resets", "payment_methods", "payouts", "referrals", "refresh_tokens", "share_tokens",
  "stream_tokens", "subscriptions", "ticket_replies", "tickets", "user_api_keys", "users", "view_logs",
  "view_daily_counters",
];

test("a clean install creates every table the code uses", async () => {
  const conn = await freshDb();
  await runMigrations({ database: DB, ...quiet });
  const [rows] = await conn.query("SHOW TABLES");
  const tables = rows.map((r) => Object.values(r)[0]);
  for (const t of EXPECTED_TABLES) assert.ok(tables.includes(t), `missing table ${t}`);
  await conn.end();
});

test("re-running is a no-op; the baseline is safe on an existing schema", async () => {
  const conn = await freshDb();
  await runMigrations({ database: DB, ...quiet });
  const second = await runMigrations({ database: DB, ...quiet });
  assert.equal(second.pending.length, 0);
  // Executing the baseline again directly must not fail (IF NOT EXISTS everywhere).
  const baseline = listMigrationFiles().find((f) => f.name.startsWith("001_"));
  const multi = await mysql.createConnection({ host: process.env.DB_HOST || "localhost", user: process.env.DB_USER || "root", password: process.env.DB_PASSWORD || "", database: DB, multipleStatements: true });
  await multi.query(baseline.sql);
  await multi.end();
  await conn.end();
});

test("editing an applied migration is detected", async () => {
  const conn = await freshDb();
  await runMigrations({ database: DB, ...quiet });
  await conn.query("UPDATE schema_migrations SET checksum = REPEAT('0', 64) WHERE name LIKE '001_%'");
  await assert.rejects(runMigrations({ database: DB, ...quiet }), /modified/);
  await conn.end();
});

test("upgrading an existing database through 003 leaves every balance unchanged", async () => {
  const conn = await freshDb();
  await runMigrations({ database: DB, upTo: "002_view_tickets.sql", ...quiet });

  // Pre-upgrade data, priced with the OLD formula: views × rate/1000 + ledger − payouts.
  await conn.query("INSERT INTO app_settings (id, value) VALUES ('earning_rate', '7.5')");
  const users = [];
  for (let i = 0; i < 3; i++) {
    const id = crypto.randomUUID();
    users.push(id);
    await conn.query("INSERT INTO users (id, name, email, password_hash) VALUES (?, 'U', ?, 'x')", [id, `${id}@example.test`]);
    for (let j = 0; j <= i; j++) {
      await conn.query(
        "INSERT INTO files (id, user_id, original_name, stored_name, mime_type, storage_path, status, view_count) VALUES (?, ?, 'f', ?, 'video/mp4', 'x', ?, ?)",
        [crypto.randomUUID(), id, `${crypto.randomUUID()}.mp4`, j % 2 ? "deleted" : "active", 1000 * (i + 1) + j]
      );
    }
    await conn.query("INSERT INTO earnings (id, user_id, type, amount) VALUES (?, ?, 'referral', 1.25)", [crypto.randomUUID(), id]);
  }
  const oldBalance = async (id) => {
    const [[v]] = await conn.query("SELECT COALESCE(SUM(view_count),0) v FROM files WHERE user_id = ?", [id]);
    const [[e]] = await conn.query("SELECT COALESCE(SUM(amount),0) e FROM earnings WHERE user_id = ?", [id]);
    return Number(v.v) * 7.5 / 1000 + Number(e.e);
  };
  const before = await Promise.all(users.map(oldBalance));

  await runMigrations({ database: DB, ...quiet });

  // computeBalance reads through the app pool, so recompute with the new formula here.
  const newBalance = async (id) => {
    const [[v]] = await conn.query("SELECT COALESCE(SUM(legacy_views),0) v FROM files WHERE user_id = ?", [id]);
    const [[e]] = await conn.query("SELECT COALESCE(SUM(amount),0) e FROM earnings WHERE user_id = ?", [id]);
    const [[r]] = await conn.query("SELECT value FROM app_settings WHERE id = 'legacy_earning_rate'");
    return Number(v.v) * Number(r.value) / 1000 + Number(e.e);
  };
  const afterUpgrade = await Promise.all(users.map(newBalance));
  assert.deepEqual(afterUpgrade, before);
  await conn.end();
});

test("migration filenames are ordered and unique", () => {
  const names = listMigrationFiles().map((f) => f.name);
  assert.deepEqual([...names].sort(), names);
  assert.equal(new Set(names.map((n) => n.slice(0, 3))).size, names.length);
});

test("006 backfills daily counters from existing counted views", async () => {
  const conn = await freshDb();
  await runMigrations({ database: DB, upTo: "005_admin_audit_log.sql", ...quiet });
  const userId = crypto.randomUUID();
  await conn.query("INSERT INTO users (id, name, email, password_hash) VALUES (?, 'U', ?, 'x')", [userId, `${userId}@example.test`]);
  for (let i = 0; i < 2; i++) {
    const fileId = crypto.randomUUID();
    await conn.query("INSERT INTO files (id, user_id, original_name, stored_name, mime_type, storage_path) VALUES (?, ?, 'f', ?, 'video/mp4', 'x')",
      [fileId, userId, `${fileId}.mp4`]);
    await conn.query("INSERT INTO view_counted (file_id, viewer_key, view_date) VALUES (?, 'u:legacy-viewer', UTC_DATE())", [fileId]);
  }
  await runMigrations({ database: DB, ...quiet });
  const [[counter]] = await conn.query("SELECT counted FROM view_daily_counters WHERE viewer_key = 'u:legacy-viewer' AND view_date = UTC_DATE()");
  assert.equal(Number(counter.counted), 2);
  await conn.end();
});

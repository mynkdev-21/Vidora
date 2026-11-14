/**
 * P3 reliability: expired-row cleanup, admin audit log (incl. impersonation),
 * unknown-route handling (N1).
 */
import { test, after, describe } from "node:test";
import assert from "node:assert/strict";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { http, keyed, createUser, createAdmin, createFile, setSetting, one, closeDb, pool } from "../helpers.js";
import { cleanupExpiredRows } from "../../src/jobs/cleanup.js";
import { config } from "../../src/config.js";

after(closeDb);

describe("expired-row cleanup", () => {
  test("removes expired tokens and keeps live ones", async () => {
    const user = await createUser();
    const f = await createFile(user.id);
    const id = () => crypto.randomUUID();
    const hex = (n) => crypto.randomBytes(n).toString("hex");
    await pool.query("INSERT INTO stream_tokens (id, file_id, token, expires_at) VALUES (?, ?, ?, NOW() - INTERVAL 1 MINUTE), (?, ?, ?, NOW() + INTERVAL 1 HOUR)",
      [id(), f.id, hex(24), id(), f.id, hex(24)]);
    await pool.query("INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, NOW() - INTERVAL 1 DAY), (?, ?, ?, NOW() + INTERVAL 1 DAY)",
      [id(), user.id, hex(20), id(), user.id, hex(20)]);
    await pool.query("INSERT INTO view_tickets (id, ticket_hash, file_id, viewer_key, expires_at) VALUES (?, ?, ?, 'ip:x', NOW() - INTERVAL 1 MINUTE)",
      [id(), hex(32), f.id]);
    await pool.query("INSERT INTO view_counted (file_id, viewer_key, view_date) VALUES (?, 'ip:old', UTC_DATE() - INTERVAL 5 DAY), (?, 'ip:today', UTC_DATE())",
      [f.id, f.id]);

    const deleted = await cleanupExpiredRows();
    assert.ok(deleted.stream_tokens >= 1 && deleted.refresh_tokens >= 1 && deleted.view_tickets >= 1 && deleted.view_counted >= 1);

    const count = async (sql, p) => Number((await one(sql, p)).n);
    assert.equal(await count("SELECT COUNT(*) n FROM stream_tokens WHERE file_id = ?", [f.id]), 1);
    assert.equal(await count("SELECT COUNT(*) n FROM refresh_tokens WHERE user_id = ?", [user.id]), 1);
    assert.equal(await count("SELECT COUNT(*) n FROM view_counted WHERE file_id = ?", [f.id]), 1, "today's de-dup row kept");
  });
});

describe("admin audit log", () => {
  test("impersonation is logged and the token names the admin", async () => {
    const admin = await createAdmin();
    const user = await createUser();
    const res = await keyed(http().post(`/api/admin/impersonate/${user.id}`), admin.token);
    assert.equal(res.status, 200);
    const claims = jwt.verify(res.body.data.accessToken, config.jwt.secret);
    assert.equal(claims.id, user.id);
    assert.equal(claims.imp, admin.id);

    const entry = await one("SELECT admin_id, action, target_id, ip FROM admin_audit_log WHERE action = 'user.impersonate' AND target_id = ?", [user.id]);
    assert.equal(entry.admin_id, admin.id);
    assert.ok(entry.ip);
  });

  test("settings changes log which keys changed, never their values", async () => {
    const admin = await createAdmin();
    await keyed(http().put("/api/admin/settings"), admin.token).send({ settings: { smtp_pass: "AUDIT-SECRET-123", telegram_url: "https://t.me/x" } });
    const entry = await one("SELECT details FROM admin_audit_log WHERE admin_id = ? AND action = 'settings.update'", [admin.id]);
    const details = typeof entry.details === "string" ? JSON.parse(entry.details) : entry.details;
    assert.deepEqual(details.keys.sort(), ["smtp_pass", "telegram_url"]);
    assert.ok(!JSON.stringify(entry).includes("AUDIT-SECRET-123"));
  });

  test("payout transitions and bans are logged; admins can read the log", async () => {
    const admin = await createAdmin();
    const user = await createUser();
    const payoutId = crypto.randomUUID();
    await pool.query("INSERT INTO payouts (id, user_id, amount, method) VALUES (?, ?, 10, 'upi')", [payoutId, user.id]);
    await keyed(http().patch(`/api/admin/payouts/${payoutId}`), admin.token).send({ status: "failed", notes: "bad account" });
    await keyed(http().patch(`/api/admin/users/${user.id}`), admin.token).send({ is_active: false });

    const log = await keyed(http().get("/api/admin/audit-log?limit=20"), admin.token);
    assert.equal(log.status, 200);
    const mine = log.body.data.entries.filter((e) => e.admin_email === admin.email);
    const payout = mine.find((e) => e.action === "payout.update");
    assert.equal(payout.target_id, payoutId);
    assert.ok(mine.some((e) => e.action === "user.update" && e.target_id === user.id));

    assert.equal((await keyed(http().get("/api/admin/audit-log"), user.token)).status, 403, "users can't read it");
  });
});

describe("N1 unknown API routes", () => {
  test("unknown /api paths are 404, not a misleading 401", async () => {
    const res = await keyed(http().get("/api/definitely-not-a-route"));
    assert.equal(res.status, 404);
  });

  test("subscription and creator routes still work at their URLs", async () => {
    await setSetting("view_min_watch_seconds", 10);
    const creator = await createUser();
    const fan = await createUser();
    await createFile(creator.id);
    assert.equal((await keyed(http().get(`/api/creators/${creator.id}`))).status, 200);
    assert.equal((await keyed(http().get(`/api/creators/${creator.id}/files`))).status, 200);
    assert.equal((await keyed(http().post(`/api/subscribe/${creator.id}`), fan.token)).status, 200);
    const status = await keyed(http().get(`/api/subscribe/status/${creator.id}`), fan.token);
    assert.equal(status.body.data.subscribed, true);
    assert.equal((await keyed(http().patch(`/api/subscribe/${creator.id}/bell`), fan.token).send({ notify: false })).status, 200);
    assert.equal((await keyed(http().get("/api/subscribe/feed"), fan.token)).body.data.files.length, 1);
    assert.equal((await keyed(http().get("/api/subscribe/feed"))).status, 401, "feed still needs a token");
  });
});

/**
 * Authentication flows and object-level authorization (IDOR) across the API.
 * These guard behaviour the audit found correct, so later changes can't
 * silently regress it.
 */
import { test, after, describe } from "node:test";
import assert from "node:assert/strict";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { http, keyed, createUser, createAdmin, createFile, createShareToken, one, closeDb, pool } from "../helpers.js";
import { config } from "../../src/config.js";

after(closeDb);

describe("authentication flows", () => {
  test("register → login → refresh (rotating) → logout", async () => {
    const email = `flow_${crypto.randomBytes(4).toString("hex")}@example.test`;
    const reg = await keyed(http().post("/api/auth/register")).send({ name: "Flow User", email, password: "Passw0rd!x" });
    assert.equal(reg.status, 201, reg.text);

    const login = await keyed(http().post("/api/auth/login")).send({ email, password: "Passw0rd!x" });
    assert.equal(login.status, 200);
    const { accessToken, refreshToken } = login.body.data;
    assert.equal((await keyed(http().get("/api/auth/me"), accessToken)).body.data.user.email, email);

    const r1 = await keyed(http().post("/api/auth/refresh")).send({ refreshToken });
    assert.equal(r1.status, 200);
    assert.equal((await keyed(http().post("/api/auth/refresh")).send({ refreshToken })).status, 401, "old refresh token is single-use");

    await keyed(http().post("/api/auth/logout")).send({ refreshToken: r1.body.data.refreshToken });
    assert.equal((await keyed(http().post("/api/auth/refresh")).send({ refreshToken: r1.body.data.refreshToken })).status, 401);
  });

  test("N6: a refresh token can be rotated exactly once, even concurrently", async () => {
    const email = `race_${crypto.randomBytes(4).toString("hex")}@example.test`;
    await keyed(http().post("/api/auth/register")).send({ name: "Race User", email, password: "Passw0rd!x" });
    const { refreshToken } = (await keyed(http().post("/api/auth/login")).send({ email, password: "Passw0rd!x" })).body.data;
    const results = await Promise.all(Array.from({ length: 5 }, () => keyed(http().post("/api/auth/refresh")).send({ refreshToken })));
    assert.equal(results.filter((r) => r.status === 200).length, 1);
    const stored = await one("SELECT token_hash FROM refresh_tokens rt JOIN users u ON u.id = rt.user_id WHERE u.email = ? LIMIT 1", [email]);
    assert.match(stored.token_hash, /^[0-9a-f]{64}$/, "stored as a SHA-256 digest");
  });

  test("tokens signed with another secret, the refresh secret, or 'none' are rejected", async () => {
    const user = await createUser();
    const forged = [
      jwt.sign({ id: user.id, role: "creator" }, "not-the-secret"),
      jwt.sign({ id: user.id, role: "creator" }, config.jwt.refreshSecret),
      `${Buffer.from('{"alg":"none","typ":"JWT"}').toString("base64url")}.${Buffer.from(JSON.stringify({ id: user.id })).toString("base64url")}.`,
    ];
    for (const t of forged) assert.equal((await keyed(http().get("/api/users/profile"), t)).status, 401);
  });

  test("banned users lose access immediately, even with a valid token", async () => {
    const user = await createUser();
    await pool.query("UPDATE users SET is_active = 0 WHERE id = ?", [user.id]);
    const res = await keyed(http().get("/api/users/profile"), user.token);
    assert.equal(res.status, 401);
    assert.equal(res.body.code, "ACCOUNT_BANNED");
  });

  test("user tokens can't reach admin routes; admin tokens can't act as users", async () => {
    const user = await createUser();
    await pool.query("UPDATE users SET role = 'admin' WHERE id = ?", [user.id]);
    const roleAdminToken = jwt.sign({ id: user.id, email: user.email, role: "admin" }, config.jwt.secret);
    assert.equal((await keyed(http().get("/api/admin/stats"), roleAdminToken)).status, 401, "users.role=admin is not an admin account");
    const admin = await createAdmin();
    assert.equal((await keyed(http().get("/api/users/profile"), admin.token)).status, 401);
  });
});

describe("object-level authorization (IDOR)", () => {
  test("users can't read, inspect, share, revoke or delete other users' files", async () => {
    const owner = await createUser();
    const other = await createUser();
    const f = await createFile(owner.id);
    const as = (method, url) => keyed(http()[method](url), other.token);
    assert.equal((await as("get", `/api/files/${f.id}`)).status, 404);
    assert.equal((await as("get", `/api/files/${f.id}/stats`)).status, 404);
    assert.equal((await as("post", `/api/share/${f.id}/generate`)).status, 404);
    assert.equal((await as("get", `/api/share/${f.id}/token`)).status, 404);
    assert.equal((await as("delete", `/api/share/${f.id}/revoke`)).status, 404);
    assert.equal((await as("delete", `/api/files/${f.id}`)).status, 404);
    assert.equal((await one("SELECT status FROM files WHERE id = ?", [f.id])).status, "active");
  });

  test("file listings only contain the caller's own files", async () => {
    const a = await createUser();
    const b = await createUser();
    await createFile(a.id);
    await createFile(b.id);
    const list = await keyed(http().get("/api/files"), a.token);
    assert.ok(list.body.data.files.length >= 1);
    const ids = list.body.data.files.map((f) => f.id);
    const [[{ n }]] = await pool.query(`SELECT COUNT(*) n FROM files WHERE id IN (?) AND user_id <> ?`, [ids, a.id]);
    assert.equal(Number(n), 0);
  });

  test("tickets, notifications and payouts are private to their owner", async () => {
    const a = await createUser();
    const b = await createUser();
    const t = await keyed(http().post("/api/tickets"), a.token).send({ subject: "Help", message: "Private details" });
    const ticketId = t.body.data.ticket_id;
    assert.equal((await keyed(http().get(`/api/tickets/${ticketId}`), b.token)).status, 404);
    assert.equal((await keyed(http().post(`/api/tickets/${ticketId}/reply`), b.token).send({ message: "hi" })).status, 404);

    const notifId = crypto.randomUUID();
    await pool.query("INSERT INTO notifications (id, user_id, title, message) VALUES (?, ?, 't', 'm')", [notifId, a.id]);
    await keyed(http().patch(`/api/notifications/${notifId}/read`), b.token);
    assert.equal((await one("SELECT is_read FROM notifications WHERE id = ?", [notifId])).is_read, 0);

    await pool.query("INSERT INTO payouts (id, user_id, amount, method) VALUES (?, ?, 50, 'upi')", [crypto.randomUUID(), a.id]);
    const bPayouts = await keyed(http().get("/api/earnings/payouts"), b.token);
    assert.equal(bPayouts.body.data.payouts.length, 0);
  });

  test("public share metadata never exposes storage details", async () => {
    const owner = await createUser();
    const f = await createFile(owner.id);
    const share = await createShareToken(f.id);
    const res = await keyed(http().get(`/api/share/view/${share}`));
    assert.equal(res.status, 200);
    const body = JSON.stringify(res.body);
    for (const field of ["stored_name", "storage_path", "public_url", f.stored_name]) assert.ok(!body.includes(field), field);
  });

  test("revoked share links stop working everywhere", async () => {
    const owner = await createUser();
    const f = await createFile(owner.id, { content: Buffer.from("bytes") });
    const share = await createShareToken(f.id);
    await keyed(http().delete(`/api/share/${f.id}/revoke`), owner.token);
    assert.equal((await keyed(http().get(`/api/share/view/${share}`))).status, 404);
    assert.equal((await keyed(http().get(`/api/share/stream/${share}`))).status, 404);
    assert.equal((await keyed(http().post(`/api/view/${share}/ticket`))).status, 404);
  });
});

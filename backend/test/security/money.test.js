/**
 * Money integrity: F6 payout race, P2d duplicate referral bonus, payout state
 * machine, P2e historical rates, F8 copy earnings.
 */
import { test, after, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";
import crypto from "crypto";
import {
  http, keyed, createUser, createAdmin, createFile, createShareToken, setSetting, one, closeDb, pool,
} from "../helpers.js";

after(closeDb);

beforeEach(async () => {
  await setSetting("earning_rate", 5);
  await setSetting("legacy_earning_rate", 5);
  await setSetting("min_payout", 5);
  await setSetting("referral_bonus", 5);
  await setSetting("view_min_watch_seconds", 10);
  await setSetting("view_daily_cap_per_viewer", 1000);
});

/** Gives a user $amount of frozen legacy earnings (2000 legacy views = $10 at $5/1000). */
async function fundUser(user, dollars) {
  const f = await createFile(user.id);
  await pool.query("UPDATE files SET legacy_views = ?, view_count = ? WHERE id = ?", [dollars * 200, dollars * 200, f.id]);
  return f;
}

const summary = async (user) => (await keyed(http().get("/api/earnings/summary"), user.token)).body.data;

async function countedView(ref, viewer) {
  const t = await keyed(http().post(`/api/view/${ref}/ticket`), viewer.token);
  assert.equal(t.status, 201, t.text);
  const hash = crypto.createHash("sha256").update(t.body.data.ticket).digest("hex");
  const [[row]] = await pool.query("SELECT stored_name FROM files WHERE id = (SELECT file_id FROM view_tickets WHERE ticket_hash = ?)", [hash]);
  const { uploadsPath } = await import("../helpers.js");
  (await import("fs")).writeFileSync(uploadsPath(row.stored_name), Buffer.alloc(128 * 1024, 7));
  const delivery = await keyed(http().get(`/api/play/${ref}`), viewer.token).set("X-View-Ticket", t.body.data.ticket);
  assert.equal(delivery.status, 200);
  for (let i = 0; i < 50; i++) {
    if ((await one("SELECT delivered_at FROM view_tickets WHERE ticket_hash = ?", [hash]))?.delivered_at) break;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  await pool.query("UPDATE view_tickets SET issued_at = DATE_SUB(issued_at, INTERVAL 60 SECOND), delivered_at = DATE_SUB(delivered_at, INTERVAL 60 SECOND) WHERE ticket_hash = ?", [hash]);
  return keyed(http().post(`/api/view/${ref}`), viewer.token).send({ ticket: t.body.data.ticket });
}

describe("F6 payout race", () => {
  test("concurrent requests can never exceed the available balance", async () => {
    const user = await createUser();
    await fundUser(user, 10);
    const results = await Promise.all(Array.from({ length: 12 }, () =>
      keyed(http().post("/api/earnings/payouts"), user.token).send({ amount: 10, method: "upi" })));
    assert.equal(results.filter((r) => r.status === 201).length, 1);
    const { total } = await one("SELECT COALESCE(SUM(amount),0) AS total FROM payouts WHERE user_id = ?", [user.id]);
    assert.equal(Number(total), 10);
  });

  test("partial concurrent requests stop exactly at the balance", async () => {
    const user = await createUser();
    await fundUser(user, 20);
    const results = await Promise.all(Array.from({ length: 10 }, () =>
      keyed(http().post("/api/earnings/payouts"), user.token).send({ amount: 6, method: "upi" })));
    assert.equal(results.filter((r) => r.status === 201).length, 3); // 3 × $6 = $18 ≤ $20 < $24
    assert.equal((await summary(user)).available_balance, 2);
  });

  test("amount validation: below minimum, over balance, rounding never rounds up", async () => {
    const user = await createUser();
    await fundUser(user, 10);
    assert.equal((await keyed(http().post("/api/earnings/payouts"), user.token).send({ amount: 10.01, method: "upi" })).status, 400);
    const ok = await keyed(http().post("/api/earnings/payouts"), user.token).send({ amount: 9.999, method: "upi" });
    assert.equal(ok.status, 201);
    assert.equal(Number((await one("SELECT amount FROM payouts WHERE id = ?", [ok.body.data.payout_id])).amount), 9.99);
  });

  test("processing payouts are reserved in the summary too", async () => {
    const user = await createUser();
    await fundUser(user, 10);
    await pool.query("INSERT INTO payouts (id, user_id, amount, method, status) VALUES (?, ?, 8, 'upi', 'processing')", [crypto.randomUUID(), user.id]);
    assert.equal((await summary(user)).available_balance, 2);
    assert.equal((await keyed(http().post("/api/earnings/payouts"), user.token).send({ amount: 5, method: "upi" })).status, 400);
  });
});

describe("P2d payout state machine and referral bonus", () => {
  async function setup() {
    const referrer = await createUser();
    const user = await createUser({ referredBy: referrer.id });
    const payoutId = crypto.randomUUID();
    await pool.query("INSERT INTO payouts (id, user_id, amount, method) VALUES (?, ?, 100, 'upi')", [payoutId, user.id]);
    return { referrer, user, payoutId, admin: await createAdmin() };
  }
  const patch = (admin, id, body) => keyed(http().patch(`/api/admin/payouts/${id}`), admin.token).send(body);

  test("completing a payout repeatedly pays the referral bonus once", async () => {
    const { referrer, payoutId, admin } = await setup();
    const statuses = [];
    for (let i = 0; i < 3; i++) statuses.push((await patch(admin, payoutId, { status: "completed" })).status);
    assert.deepEqual(statuses, [200, 200, 200]); // idempotent re-save
    const { n, s } = await one("SELECT COUNT(*) n, COALESCE(SUM(amount),0) s FROM earnings WHERE user_id = ? AND type = 'referral'", [referrer.id]);
    assert.equal(Number(n), 1);
    assert.equal(Number(s), 5);
  });

  test("concurrent completions also pay once", async () => {
    const { referrer, payoutId, admin } = await setup();
    await Promise.all(Array.from({ length: 6 }, () => patch(admin, payoutId, { status: "completed" })));
    assert.equal(Number((await one("SELECT COUNT(*) n FROM earnings WHERE user_id = ? AND type = 'referral'", [referrer.id])).n), 1);
  });

  test("completed is terminal; failed can be reopened", async () => {
    const { payoutId, admin } = await setup();
    assert.equal((await patch(admin, payoutId, { status: "failed" })).status, 200);
    assert.equal((await patch(admin, payoutId, { status: "pending" })).status, 200);
    assert.equal((await patch(admin, payoutId, { status: "completed" })).status, 200);
    assert.equal((await patch(admin, payoutId, { status: "pending" })).status, 409);
    assert.equal((await patch(admin, payoutId, { status: "failed" })).status, 409);
    assert.equal((await patch(admin, crypto.randomUUID(), { status: "completed" })).status, 404);
  });

  test("user notifications are sent once per transition", async () => {
    const { user, payoutId, admin } = await setup();
    for (let i = 0; i < 3; i++) await patch(admin, payoutId, { status: "completed" });
    assert.equal(Number((await one("SELECT COUNT(*) n FROM notifications WHERE user_id = ? AND type = 'payout'", [user.id])).n), 1);
  });
});

describe("P2e changing the rate never re-prices past views", () => {
  test("legacy and ledger views keep the rate they were earned at", async () => {
    const owner = await createUser();
    await fundUser(owner, 10); // 2000 legacy views @ $5 = $10
    const f = await createFile(owner.id);
    await countedView(f.id, await createUser()); // 1 view @ $5/1000 = 0.005
    const before = await summary(owner);
    assert.equal(before.total, 10.005);

    await setSetting("earning_rate", 50); // admin raises the rate tenfold
    assert.equal((await summary(owner)).total, 10.005, "past earnings unchanged");

    await countedView(f.id, await createUser()); // new view @ $50/1000 = 0.05
    assert.equal((await summary(owner)).total, 10.055);
    assert.equal((await summary(owner)).rate_per_1000, 50);
  });

  test("purging a file keeps its earnings", async () => {
    const owner = await createUser();
    const f = await fundUser(owner, 10);
    await countedView(f.id, await createUser());
    const before = (await summary(owner)).total;
    await pool.query("UPDATE files SET status = 'deleted' WHERE id = ?", [f.id]);
    const admin = await createAdmin();
    assert.equal((await keyed(http().delete("/api/admin/files-purge/all"), admin.token)).status, 200);
    assert.equal(await one("SELECT id FROM files WHERE id = ?", [f.id]), undefined);
    assert.equal((await summary(owner)).total, before);
  });
});

describe("F8 copying files", () => {
  test("copying by raw file ID is refused; an active share link works", async () => {
    const owner = await createUser();
    const copier = await createUser();
    const f = await createFile(owner.id);
    const copy = (url) => keyed(http().post("/api/files/copy"), copier.token).send({ url });

    assert.equal((await copy(f.id)).status, 404, "raw ID");
    const share = await createShareToken(f.id);
    assert.equal((await copy(`https://vidora.app/v/${share}?utm=x`)).status, 201);

    await pool.query("UPDATE share_tokens SET is_active = 0 WHERE token = ?", [share]);
    assert.equal((await copy(share)).status, 404, "revoked link");
  });

  test("views on a copy pay the original uploader, not the copier", async () => {
    const owner = await createUser();
    const copier = await createUser();
    const f = await createFile(owner.id);
    const share = await createShareToken(f.id);
    const copied = await keyed(http().post("/api/files/copy"), copier.token).send({ url: share });
    assert.equal(copied.status, 201);

    const res = await countedView(copied.body.data.share_token, await createUser());
    assert.equal(res.body.counted, true);
    assert.equal((await summary(owner)).total, 0.005);
    assert.equal((await summary(copier)).total, 0);
  });

  test("copies of copies still pay the original uploader; owners can't re-copy", async () => {
    const owner = await createUser();
    const a = await createUser();
    const b = await createUser();
    const f = await createFile(owner.id);
    const s1 = await createShareToken(f.id);
    const c1 = await keyed(http().post("/api/files/copy"), a.token).send({ url: s1 });
    const c2 = await keyed(http().post("/api/files/copy"), b.token).send({ url: c1.body.data.share_token });
    assert.equal(c2.status, 201);
    assert.equal(c2.body.data.file.payee_user_id, owner.id);
    assert.equal(c2.body.data.file.source_file_id, f.id);
    const back = await keyed(http().post("/api/files/copy"), owner.token).send({ url: c1.body.data.share_token });
    assert.equal(back.status, 400);
  });

  test("the original uploader viewing a copy is a self-view", async () => {
    const owner = await createUser();
    const copier = await createUser();
    const f = await createFile(owner.id);
    const share = await createShareToken(f.id);
    const copied = await keyed(http().post("/api/files/copy"), copier.token).send({ url: share });
    const res = await countedView(copied.body.data.share_token, owner);
    assert.equal(res.body.reason, "self_view");
  });
});

describe("F7 purge must not delete objects other rows still use", () => {
  test("purging one reference keeps the shared object; purging the last removes it", async () => {
    const fs = await import("fs");
    const { uploadsPath } = await import("../helpers.js");
    const owner = await createUser();
    const copier = await createUser();
    const f = await createFile(owner.id, { content: Buffer.from("shared-bytes") });
    const share = await createShareToken(f.id);
    const copied = await keyed(http().post("/api/files/copy"), copier.token).send({ url: share });
    const admin = await createAdmin();
    const purge = () => keyed(http().delete("/api/admin/files-purge/all"), admin.token);

    await keyed(http().delete(`/api/files/${copied.body.data.file.id}`), copier.token);
    const first = await purge();
    assert.equal(first.status, 200);
    assert.ok(fs.existsSync(uploadsPath(f.stored_name)), "owner's object must survive");
    assert.equal((await one("SELECT status FROM files WHERE id = ?", [f.id])).status, "active");

    await keyed(http().delete(`/api/files/${f.id}`), owner.token);
    await purge();
    assert.equal(fs.existsSync(uploadsPath(f.stored_name)), false, "last reference gone → object removed");
  });
});

describe("F10 admin login brute force", () => {
  test("repeated failures for one admin email are throttled", async () => {
    const admin = await createAdmin();
    const statuses = [];
    for (let i = 0; i < 7; i++) {
      statuses.push((await keyed(http().post("/api/admin/auth/login")).send({ email: admin.email, password: `wrong-${i}` })).status);
    }
    assert.deepEqual(statuses.slice(0, 5), [401, 401, 401, 401, 401]);
    assert.equal(statuses[5], 429);
    // Even the correct password is refused while throttled.
    assert.equal((await keyed(http().post("/api/admin/auth/login")).send({ email: admin.email, password: admin.password })).status, 429);
  });

  test("failures across many emails from one IP are throttled", async () => {
    const statuses = [];
    for (let i = 0; i < 12; i++) {
      statuses.push((await keyed(http().post("/api/admin/auth/login")).send({ email: `nobody${i}@example.test`, password: "x" })).status);
    }
    assert.ok(statuses.includes(429), `statuses: ${statuses}`);
  });
});

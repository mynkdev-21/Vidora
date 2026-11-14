/**
 * F5 — paid view fraud. Views must be validated server-side: one-time
 * tickets, minimum watch time, per-viewer de-duplication, caps, audit log.
 */
import { test, after, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { http, keyed, createUser, createFile, createShareToken, setSetting, one, closeDb, pool } from "../helpers.js";

after(closeDb);

beforeEach(async () => {
  await setSetting("view_min_watch_seconds", 10);
  await setSetting("view_min_watch_seconds_image", 3);
  await setSetting("view_daily_cap_per_viewer", 100);
});

async function ticketFor(ref, { token, headers = {} } = {}) {
  const res = await keyed(http().post(`/api/view/${ref}/ticket`), token).set(headers);
  assert.equal(res.status, 201, res.text);
  return res.body.data;
}

/** Ages a ticket so the minimum watch time has elapsed (no real sleeping). */
async function age(ticketData, seconds = 60) {
  const crypto = await import("crypto");
  const hash = crypto.createHash("sha256").update(ticketData.ticket).digest("hex");
  await pool.query("UPDATE view_tickets SET issued_at = DATE_SUB(issued_at, INTERVAL ? SECOND) WHERE ticket_hash = ?", [seconds, hash]);
}

const redeem = (ref, ticket, { token, headers = {} } = {}) =>
  keyed(http().post(`/api/view/${ref}`), token).set(headers).send(ticket === undefined ? {} : { ticket });

const viewCount = async (fileId) => (await one("SELECT view_count FROM files WHERE id = ?", [fileId])).view_count;

describe("F5 view-reward fraud", () => {
  test("the old ticketless call no longer counts a view", async () => {
    const owner = await createUser();
    const f = await createFile(owner.id);
    const res = await redeem(f.id, undefined);
    assert.equal(res.status, 400);
    assert.equal(res.body.code, "VIEW_TICKET_REQUIRED");
    assert.equal(Number(await viewCount(f.id)), 0);
  });

  test("forged X-Forwarded-For values cannot mint extra views (TRUST_PROXY unset)", async () => {
    const owner = await createUser();
    const f = await createFile(owner.id);
    for (let i = 1; i <= 5; i++) {
      const headers = { "X-Forwarded-For": `203.0.113.${i}` };
      const t = await ticketFor(f.id, { headers });
      await age(t);
      await redeem(f.id, t.ticket, { headers });
    }
    assert.equal(Number(await viewCount(f.id)), 1, "all five requests come from one real client");
    const reasons = await pool.query("SELECT reason, COUNT(*) n FROM view_events WHERE file_id = ? GROUP BY reason", [f.id]);
    const byReason = Object.fromEntries(reasons[0].map((r) => [r.reason, r.n]));
    assert.deepEqual(byReason, { ok: 1, duplicate: 4 });
  });

  test("redeeming before the minimum watch time is refused and the ticket stays usable", async () => {
    const owner = await createUser();
    const viewer = await createUser();
    const f = await createFile(owner.id);
    const t = await ticketFor(f.id, { token: viewer.token });
    assert.equal(t.min_watch_seconds, 10);

    const early = await redeem(f.id, t.ticket, { token: viewer.token });
    assert.equal(early.status, 400);
    assert.equal(early.body.code, "VIEW_TOO_SOON");
    assert.ok(early.body.retry_after > 0);

    await age(t);
    const later = await redeem(f.id, t.ticket, { token: viewer.token });
    assert.equal(later.status, 200);
    assert.equal(later.body.counted, true);
    assert.equal(Number(await viewCount(f.id)), 1);
  });

  test("tickets are single-use, file-bound and unforgeable", async () => {
    const owner = await createUser();
    const f1 = await createFile(owner.id);
    const f2 = await createFile(owner.id);
    const t = await ticketFor(f1.id);
    await age(t);

    assert.equal((await redeem(f2.id, t.ticket)).body.code, "INVALID_VIEW_TICKET", "ticket for another file");
    assert.equal((await redeem(f1.id, "x".repeat(43))).body.code, "INVALID_VIEW_TICKET", "made-up ticket");
    assert.equal((await redeem(f1.id, t.ticket)).body.counted, true);
    assert.equal((await redeem(f1.id, t.ticket)).body.code, "INVALID_VIEW_TICKET", "replay");
    assert.equal(Number(await viewCount(f1.id)), 1);
  });

  test("expired tickets are refused", async () => {
    const owner = await createUser();
    const f = await createFile(owner.id);
    const t = await ticketFor(f.id);
    await age(t);
    const crypto = await import("crypto");
    await pool.query("UPDATE view_tickets SET expires_at = DATE_SUB(NOW(), INTERVAL 1 SECOND) WHERE ticket_hash = ?",
      [crypto.createHash("sha256").update(t.ticket).digest("hex")]);
    assert.equal((await redeem(f.id, t.ticket)).body.code, "INVALID_VIEW_TICKET");
  });

  test("owners don't earn from their own views", async () => {
    const owner = await createUser();
    const f = await createFile(owner.id);
    const t = await ticketFor(f.id, { token: owner.token });
    await age(t);
    const res = await redeem(f.id, t.ticket, { token: owner.token });
    assert.equal(res.body.counted, false);
    assert.equal(res.body.reason, "self_view");
    assert.equal(Number(await viewCount(f.id)), 0);
  });

  test("distinct signed-in viewers each count once per day", async () => {
    const owner = await createUser();
    const f = await createFile(owner.id);
    const share = await createShareToken(f.id);
    for (let i = 0; i < 3; i++) {
      const viewer = await createUser();
      for (let j = 0; j < 2; j++) {
        const t = await ticketFor(share, { token: viewer.token });
        await age(t);
        await redeem(share, t.ticket, { token: viewer.token });
      }
    }
    assert.equal(Number(await viewCount(f.id)), 3);
    assert.equal(Number((await one("SELECT view_count FROM share_tokens WHERE token = ?", [share])).view_count), 3);
  });

  test("concurrent redemptions by one viewer count exactly once", async () => {
    const owner = await createUser();
    const viewer = await createUser();
    const f = await createFile(owner.id);
    const tickets = [];
    for (let i = 0; i < 8; i++) {
      const t = await ticketFor(f.id, { token: viewer.token });
      await age(t);
      tickets.push(t.ticket);
    }
    const results = await Promise.all(tickets.map((t) => redeem(f.id, t, { token: viewer.token })));
    assert.equal(results.filter((r) => r.body.counted).length, 1);
    assert.equal(Number(await viewCount(f.id)), 1);
  });

  test("per-viewer daily cap", async () => {
    await setSetting("view_daily_cap_per_viewer", 2);
    const owner = await createUser();
    const viewer = await createUser();
    const outcomes = [];
    for (let i = 0; i < 3; i++) {
      const f = await createFile(owner.id);
      const t = await ticketFor(f.id, { token: viewer.token });
      await age(t);
      outcomes.push((await redeem(f.id, t.ticket, { token: viewer.token })).body.reason);
    }
    assert.deepEqual(outcomes, ["ok", "ok", "viewer_daily_cap"]);
  });

  test("images use the shorter image watch time", async () => {
    const owner = await createUser();
    const f = await createFile(owner.id, { mimeType: "image/jpeg" });
    const t = await ticketFor(f.id);
    assert.equal(t.min_watch_seconds, 3);
  });

  test("every redemption is audited with viewer identity and reason", async () => {
    const owner = await createUser();
    const viewer = await createUser();
    const f = await createFile(owner.id);
    const t = await ticketFor(f.id, { token: viewer.token });
    await age(t);
    await redeem(f.id, t.ticket, { token: viewer.token });
    const ev = await one("SELECT viewer_key, user_id, counted, reason FROM view_events WHERE file_id = ?", [f.id]);
    assert.deepEqual({ ...ev }, { viewer_key: `u:${viewer.id}`, user_id: viewer.id, counted: 1, reason: "ok" });
  });

  test("tickets are only issued for active files", async () => {
    const owner = await createUser();
    const deleted = await createFile(owner.id, { status: "deleted" });
    assert.equal((await keyed(http().post(`/api/view/${deleted.id}/ticket`))).status, 404);
    assert.equal((await keyed(http().post("/api/view/not-a-real-file/ticket"))).status, 404);
  });
});

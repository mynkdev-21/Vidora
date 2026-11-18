import { test, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import crypto from "crypto";
import { http, keyed, createUser, createFile, setSetting, one, closeDb, pool } from "../helpers.js";

after(closeDb);
beforeEach(async () => {
  await setSetting("view_min_watch_seconds", 10);
  await setSetting("view_daily_cap_per_viewer", 100);
});

const media = Buffer.alloc(128 * 1024, 7);
const hash = (ticket) => crypto.createHash("sha256").update(ticket).digest("hex");
async function ticketFor(ref, user) {
  const res = await keyed(http().post(`/api/view/${ref}/ticket`), user.token);
  assert.equal(res.status, 201, res.text);
  return res.body.data.ticket;
}
async function age(ticket) {
  await pool.query("UPDATE view_tickets SET issued_at = DATE_SUB(issued_at, INTERVAL 60 SECOND), delivered_at = DATE_SUB(delivered_at, INTERVAL 60 SECOND) WHERE ticket_hash = ?", [hash(ticket)]);
}
async function deliver(ref, ticket, user, range) {
  let req = keyed(http().get(`/api/play/${ref}`), user.token).set("X-View-Ticket", ticket);
  if (range) req = req.set("Range", range);
  const res = await req.buffer(true).parse((response, callback) => {
    const chunks = [];
    response.on("data", (chunk) => chunks.push(chunk));
    response.on("end", () => callback(null, Buffer.concat(chunks)));
  });
  for (let i = 0; i < 50; i++) {
    const row = await one("SELECT delivered_at FROM view_tickets WHERE ticket_hash = ?", [hash(ticket)]);
    if (row?.delivered_at) break;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  return res;
}
const redeem = (ref, ticket, user) => keyed(http().post(`/api/view/${ref}`), user?.token).send({ ticket });
const viewCount = async (id) => Number((await one("SELECT view_count FROM files WHERE id = ?", [id])).view_count);

test("timer and anonymous playback alone never earn", async () => {
  const owner = await createUser(), viewer = await createUser();
  const f = await createFile(owner.id, { content: media });
  const t = await ticketFor(f.id, viewer);
  await age(t);
  assert.equal((await redeem(f.id, t, viewer)).body.code, "MEDIA_DELIVERY_REQUIRED");
  assert.equal((await keyed(http().get(`/api/play/${f.id}`))).status, 200);
  assert.equal((await redeem(f.id, t, viewer)).body.code, "MEDIA_DELIVERY_REQUIRED");
  assert.equal(await viewCount(f.id), 0);
});

test("anonymous owner cannot mint or redeem a paid ticket", async () => {
  const owner = await createUser();
  const f = await createFile(owner.id, { content: media });
  assert.equal((await keyed(http().post(`/api/view/${f.id}/ticket`))).status, 401);
  const t = await ticketFor(f.id, owner);
  assert.equal((await redeem(f.id, t)).status, 401);
  await deliver(f.id, t, owner);
  await age(t);
  const result = await redeem(f.id, t, owner);
  assert.equal(result.body.reason, "self_view");
  assert.equal(await viewCount(f.id), 0);
});

test("delivery plus timer count once; replay fails", async () => {
  const owner = await createUser(), viewer = await createUser();
  const f = await createFile(owner.id, { content: media });
  const t = await ticketFor(f.id, viewer);
  await deliver(f.id, t, viewer);
  assert.equal((await redeem(f.id, t, viewer)).body.code, "VIEW_TOO_SOON");
  await age(t);
  assert.equal((await redeem(f.id, t, viewer)).body.counted, true);
  assert.equal((await redeem(f.id, t, viewer)).body.code, "INVALID_VIEW_TICKET");
  assert.equal(await viewCount(f.id), 1);
});

test("borrowed ticket and inadequate ranges cannot earn", async () => {
  const owner = await createUser(), a = await createUser(), b = await createUser();
  const f = await createFile(owner.id, { content: media });
  const t = await ticketFor(f.id, a);
  assert.equal((await keyed(http().get(`/api/play/${f.id}`), b.token).set("X-View-Ticket", t)).status, 403);
  assert.equal((await redeem(f.id, t, b)).body.code, "INVALID_VIEW_TICKET");
  assert.equal((await deliver(f.id, t, a, "bytes=0-100")).status, 206);
  assert.equal((await redeem(f.id, t, a)).body.code, "MEDIA_DELIVERY_REQUIRED");
  assert.equal((await deliver(f.id, t, a, "bytes=65536-131071")).status, 206);
  assert.equal((await redeem(f.id, t, a)).body.code, "MEDIA_DELIVERY_REQUIRED");
  await deliver(f.id, t, a, "bytes=0-65535");
  await age(t);
  assert.equal((await redeem(f.id, t, a)).body.counted, true);
});

test("parallel cross-file redemptions obey atomic daily cap", async () => {
  await setSetting("view_daily_cap_per_viewer", 2);
  const owner = await createUser(), viewer = await createUser();
  const files = await Promise.all(Array.from({ length: 8 }, () => createFile(owner.id, { content: media })));
  const tickets = await Promise.all(files.map((f) => ticketFor(f.id, viewer)));
  await Promise.all(files.map((f, i) => deliver(f.id, tickets[i], viewer)));
  await Promise.all(tickets.map(age));
  const results = await Promise.all(files.map((f, i) => redeem(f.id, tickets[i], viewer)));
  assert.equal(results.filter((r) => r.body.counted).length, 2);
  const counter = await one("SELECT counted FROM view_daily_counters WHERE viewer_key = ? AND view_date = UTC_DATE()", [`u:${viewer.id}`]);
  assert.equal(Number(counter.counted), 2);
  assert.equal(Number((await one("SELECT COUNT(*) n FROM view_counted WHERE viewer_key = ? AND view_date = UTC_DATE()", [`u:${viewer.id}`])).n), 2);
});

test("parallel redemption of one ticket credits at most once", async () => {
  const owner = await createUser(), viewer = await createUser();
  const f = await createFile(owner.id, { content: media });
  const t = await ticketFor(f.id, viewer);
  await deliver(f.id, t, viewer);
  await age(t);
  const results = await Promise.all(Array.from({ length: 8 }, () => redeem(f.id, t, viewer)));
  assert.equal(results.filter((r) => r.body.counted).length, 1);
  assert.equal(await viewCount(f.id), 1);
  assert.equal(Number((await one("SELECT COUNT(*) n FROM view_events WHERE file_id = ? AND counted = 1", [f.id])).n), 1);
});

test("zero-byte file, expired ticket, removed file cannot earn", async () => {
  const owner = await createUser(), viewer = await createUser();
  const f = await createFile(owner.id, { content: Buffer.alloc(0) });
  const t = await ticketFor(f.id, viewer);
  await age(t);
  await deliver(f.id, t, viewer);
  assert.equal((await redeem(f.id, t, viewer)).body.code, "MEDIA_DELIVERY_REQUIRED");
  await pool.query("UPDATE view_tickets SET expires_at = NOW() - INTERVAL 1 SECOND WHERE ticket_hash = ?", [hash(t)]);
  assert.equal((await redeem(f.id, t, viewer)).body.code, "INVALID_VIEW_TICKET");
  await pool.query("UPDATE files SET status = 'deleted' WHERE id = ?", [f.id]);
  assert.equal((await redeem(f.id, t, viewer)).status, 404);
});

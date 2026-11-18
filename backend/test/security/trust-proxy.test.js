/**
 * P2 — trusted proxy configuration. With TRUST_PROXY=1 (one reverse proxy in
 * front of the API) the client IP is the address the proxy appended — the
 * RIGHTMOST X-Forwarded-For entry — never the leftmost, client-supplied one
 * that the old view counter used.
 */
process.env.TRUST_PROXY = "1";

const { test, after } = await import("node:test");
const assert = (await import("node:assert/strict")).default;
const { http, keyed, createUser, createFile, setSetting, one, closeDb } = await import("../helpers.js");

after(closeDb);

test("paid tickets require authenticated identity regardless of forwarded IP", async () => {
  await setSetting("view_min_watch_seconds", 10);
  const owner = await createUser();
  const f = await createFile(owner.id);

  // Client claims 6.6.6.6; the proxy appended the real address 198.51.100.7.
  const viewer = await createUser();
  const res = await keyed(http().post(`/api/view/${f.id}/ticket`), viewer.token).set("X-Forwarded-For", "6.6.6.6, 198.51.100.7");
  assert.equal(res.status, 201);
  const row = await one("SELECT viewer_key FROM view_tickets WHERE file_id = ?", [f.id]);
  assert.equal(row.viewer_key, `u:${viewer.id}`);
});

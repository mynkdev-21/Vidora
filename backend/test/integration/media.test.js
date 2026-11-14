/**
 * Media serving: Range handling (P3), stream-token route (P3), content-safety
 * headers on user files (P2), and pre-auth upload writes (F9).
 */
import { test, after, describe } from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import crypto from "crypto";
import { http, keyed, createUser, createFile, createShareToken, uploadsPath, closeDb, pool } from "../helpers.js";

after(closeDb);

const binary = (req) => req.buffer(true).parse((res, cb) => {
  const chunks = []; res.on("data", (c) => chunks.push(c)); res.on("end", () => cb(null, Buffer.concat(chunks)));
});

describe("Range requests on /api/play", () => {
  test("explicit, open-ended and suffix ranges return 206 with correct bytes", async () => {
    const user = await createUser();
    const bytes = crypto.randomBytes(1000);
    const f = await createFile(user.id, { content: bytes });

    const cases = [["bytes=0-99", 0, 99], ["bytes=900-", 900, 999], ["bytes=-100", 900, 999]];
    for (const [range, start, end] of cases) {
      const res = await binary(keyed(http().get(`/api/play/${f.id}`)).set("Range", range));
      assert.equal(res.status, 206, range);
      assert.equal(res.headers["content-range"], `bytes ${start}-${end}/1000`);
      assert.deepEqual(res.body, bytes.subarray(start, end + 1));
    }
  });

  test("unsatisfiable range → 416 with Content-Range */size", async () => {
    const user = await createUser();
    const f = await createFile(user.id, { content: crypto.randomBytes(10) });
    const res = await keyed(http().get(`/api/play/${f.id}`)).set("Range", "bytes=50-");
    assert.equal(res.status, 416);
    assert.equal(res.headers["content-range"], "bytes */10");
  });
});

describe("Content safety for user uploads", () => {
  test("files claiming an executable type are served as a sandboxed download", async () => {
    const user = await createUser();
    const f = await createFile(user.id, { content: Buffer.from("<script>alert(1)</script>"), mimeType: "text/html" });
    const res = await keyed(http().get(`/api/play/${f.id}`));
    assert.equal(res.headers["content-type"], "application/octet-stream");
    assert.equal(res.headers["content-disposition"], "attachment");
    assert.match(res.headers["content-security-policy"], /sandbox/);
    assert.equal(res.headers["x-content-type-options"], "nosniff");
  });
});

describe("Share stream URL", () => {
  test("the URL from /api/share/stream plays (no API key needed) and supports Range", async () => {
    const user = await createUser();
    const bytes = crypto.randomBytes(256);
    const f = await createFile(user.id, { content: bytes });
    const share = await createShareToken(f.id);

    const s = await keyed(http().get(`/api/share/stream/${share}`));
    assert.equal(s.status, 200);
    assert.match(s.body.data.stream_url, /^\/api\/stream\/[0-9a-f]{48}\/video$/);
    assert.ok(s.body.data.expires_in >= 3600);

    const full = await binary(http().get(s.body.data.stream_url));
    assert.equal(full.status, 200);
    assert.deepEqual(full.body, bytes);

    const part = await binary(http().get(s.body.data.stream_url).set("Range", "bytes=-16"));
    assert.equal(part.status, 206);
    assert.deepEqual(part.body, bytes.subarray(240));
  });

  test("unknown or expired stream tokens are refused", async () => {
    assert.equal((await http().get(`/api/stream/${"a".repeat(48)}/video`)).status, 410);
    // Encoded traversal reaches the route as "../../etc" and fails the token format check.
    assert.equal((await http().get("/api/stream/..%2F..%2Fetc/video")).status, 404);
  });
});

describe("F9 uploads are authenticated before anything is written", () => {
  const count = () => fs.readdirSync(uploadsPath()).filter((n) => !["thumbnails", "avatars", "receipts"].includes(n)).length;

  test("bot-upload with a bogus user key is rejected and leaves no file", async () => {
    const before = count();
    const res = await keyed(http().post("/api/files/bot-upload"))
      .set("X-User-Api-Key", "bogus").set("X-Bot-User-Id", "bogus")
      .attach("file", crypto.randomBytes(4096), "junk.bin");
    assert.equal(res.status, 403);
    assert.equal(count(), before);
  });

  test("bot-upload with a valid per-user key stores the file for that user", async () => {
    const user = await createUser();
    const key = `vdr_user_${crypto.randomBytes(24).toString("hex")}`;
    await pool.query("INSERT INTO user_api_keys (id, user_id, api_key) VALUES (?, ?, ?)", [crypto.randomUUID(), user.id, key]);
    const res = await keyed(http().post("/api/files/bot-upload"))
      .set("X-User-Api-Key", key).set("X-Bot-User-Id", user.id)
      .attach("file", Buffer.from("hello"), { filename: "note.txt", contentType: "text/plain" });
    assert.equal(res.status, 201, res.text);
    assert.equal(res.body.data.file.user_id, user.id);
  });

  test("dashboard upload without a token writes nothing", async () => {
    const before = count();
    const res = await keyed(http().post("/api/files/upload")).attach("file", crypto.randomBytes(4096), "junk.bin");
    assert.equal(res.status, 401);
    assert.equal(count(), before);
  });
});

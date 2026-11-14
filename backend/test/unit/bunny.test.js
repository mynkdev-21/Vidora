/**
 * P3 — BunnyCDN storage. The old code piped a WHATWG ReadableStream (crash),
 * ignored Range requests (no seeking) and buffered whole files in memory on
 * upload. These tests drive the adapter with a fake fetch().
 */
import { test, after } from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import os from "os";
import path from "path";
import { Readable } from "stream";
import { openBunny, __test } from "../../src/utils/storage.js";
import pool from "../../src/db/connection.js";

// storage.js opens the DB pool on import; close it so this process can exit.
after(() => pool.end());

const settings = { storage_bunny_zone: "zone", storage_bunny_api_key: "KEY", storage_bunny_region: "" };

function fakeFetch(status, body, headers = {}) {
  const calls = [];
  const impl = async (url, init = {}) => {
    const call = { url, init, bytesSent: 0 };
    calls.push(call);
    // Like a real HTTP client, consume a streamed request body.
    if (init.body && typeof init.body[Symbol.asyncIterator] === "function") {
      for await (const chunk of init.body) call.bytesSent += chunk.length;
    }
    return new Response(status === 416 ? null : body, { status, headers });
  };
  return { impl, calls };
}

const collect = async (stream) => {
  const chunks = [];
  for await (const c of stream) chunks.push(Buffer.from(c));
  return Buffer.concat(chunks);
};

test("ranged read forwards Range and returns a pipeable Node stream", async () => {
  const { impl, calls } = fakeFetch(206, "abcd", { "content-range": "bytes 10-13/100", "content-length": "4" });
  const res = await openBunny("video.mp4", settings, "bytes=10-13", impl);
  assert.equal(calls[0].init.headers.Range, "bytes=10-13");
  assert.equal(calls[0].init.headers.AccessKey, "KEY");
  assert.ok(res.stream instanceof Readable, "must be a Node Readable (has .pipe)");
  assert.equal(typeof res.stream.pipe, "function");
  assert.deepEqual({ partial: res.partial, start: res.start, end: res.end, size: res.size }, { partial: true, start: 10, end: 13, size: 100 });
  assert.equal((await collect(res.stream)).toString(), "abcd");
});

test("full read when no range is requested (or Bunny ignores it)", async () => {
  const { impl } = fakeFetch(200, "whole-file", { "content-length": "10" });
  const res = await openBunny("video.mp4", settings, "bytes=0-3", impl);
  assert.equal(res.partial, false);
  assert.equal(res.size, 10);
  assert.equal((await collect(res.stream)).toString(), "whole-file");
});

test("416 from Bunny is surfaced as unsatisfiable; 404 as not found", async () => {
  const unsat = await openBunny("v.mp4", settings, "bytes=500-", fakeFetch(416, null, { "content-range": "bytes */100" }).impl);
  assert.deepEqual(unsat, { unsatisfiable: true, size: 100 });
  assert.equal(await openBunny("v.mp4", settings, undefined, fakeFetch(404, "nope").impl), null);
});

test("malformed Range headers are not forwarded", async () => {
  const { impl, calls } = fakeFetch(200, "x");
  await openBunny("v.mp4", settings, "bytes=0-1\r\nX-Evil: 1", impl);
  assert.equal(calls[0].init.headers.Range, undefined);
});

test("uploads stream from disk with an explicit Content-Length (no full-file buffer)", async () => {
  const file = path.join(os.tmpdir(), `vidora-bunny-${process.pid}.bin`);
  fs.writeFileSync(file, Buffer.alloc(4096, 7));
  try {
    const { impl, calls } = fakeFetch(201, "");
    const out = await __test.uploadBunny(file, "abc.mp4", "", settings, impl);
    const { url, init } = calls[0];
    assert.equal(url, "https://storage.bunnycdn.com/zone/abc.mp4");
    assert.equal(init.method, "PUT");
    assert.equal(init.headers["Content-Length"], "4096");
    assert.ok(init.body instanceof fs.ReadStream, "body must be a file stream, not a Buffer");
    assert.equal(init.duplex, "half");
    assert.equal(calls[0].bytesSent, 4096, "every byte was streamed");
    assert.equal(out.publicUrl, "https://zone.b-cdn.net/abc.mp4");
  } finally {
    fs.rmSync(file, { force: true });
  }
});

test("object keys refuse traversal", () => {
  assert.throws(() => __test.objectKey("../x", ""), /Unsafe/);
  assert.throws(() => __test.objectKey("a/b", ""), /Unsafe/);
  assert.throws(() => __test.objectKey("ok.mp4", "../etc"), /Unsafe/);
  assert.equal(__test.objectKey("ok.mp4", "thumbnails"), "thumbnails/ok.mp4");
});

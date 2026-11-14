import { test } from "node:test";
import assert from "node:assert/strict";
import { parseRange } from "../../src/utils/media.js";

test("parseRange: absent or malformed headers serve the whole file", () => {
  assert.equal(parseRange(undefined, 100), null);
  assert.equal(parseRange("", 100), null);
  assert.equal(parseRange("items=0-1", 100), null);
  assert.equal(parseRange("bytes=0-1,5-9", 100), null); // multi-range unsupported → full body
  assert.equal(parseRange("bytes=-", 100), null);
  assert.equal(parseRange("bytes=abc-def", 100), null);
});

test("parseRange: explicit and open-ended ranges", () => {
  assert.deepEqual(parseRange("bytes=0-0", 100), { start: 0, end: 0 });
  assert.deepEqual(parseRange("bytes=10-19", 100), { start: 10, end: 19 });
  assert.deepEqual(parseRange("bytes=90-", 100), { start: 90, end: 99 });
  assert.deepEqual(parseRange("bytes=90-500", 100), { start: 90, end: 99 }); // end clamped
});

test("P3: parseRange: suffix ranges (bytes=-N) return the last N bytes", () => {
  assert.deepEqual(parseRange("bytes=-10", 100), { start: 90, end: 99 });
  assert.deepEqual(parseRange("bytes=-500", 100), { start: 0, end: 99 });
  assert.equal(parseRange("bytes=-0", 100), "unsatisfiable");
});

test("parseRange: unsatisfiable ranges", () => {
  assert.equal(parseRange("bytes=100-", 100), "unsatisfiable");
  assert.equal(parseRange("bytes=50-10", 100), "unsatisfiable");
  assert.equal(parseRange("bytes=0-", 0), "unsatisfiable");
  assert.equal(parseRange("bytes=-5", 0), "unsatisfiable");
});

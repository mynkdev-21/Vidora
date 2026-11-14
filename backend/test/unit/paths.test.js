import { test } from "node:test";
import assert from "node:assert/strict";
import path from "path";
import { resolveUploadPath, isSafeStoredName, safeExtension, generateStoredName } from "../../src/utils/paths.js";

const ROOT = path.resolve("/srv/vidora/uploads");

test("F2: resolveUploadPath rejects traversal and separators", () => {
  for (const evil of [
    "../.env", "..", ".", "../../etc/passwd", "a/../../b", "sub/file.mp4", "..\\.env",
    "/etc/passwd", "file\0.mp4", ".hidden", "", "x".repeat(256),
  ]) {
    assert.equal(resolveUploadPath(evil, "", ROOT), null, `should reject ${JSON.stringify(evil)}`);
  }
  assert.equal(resolveUploadPath(null, "", ROOT), null);
  assert.equal(resolveUploadPath(42, "", ROOT), null);
});

test("F2: resolveUploadPath rejects unknown subfolders", () => {
  assert.equal(resolveUploadPath("a.jpg", "..", ROOT), null);
  assert.equal(resolveUploadPath("a.jpg", "../avatars", ROOT), null);
  assert.equal(resolveUploadPath("a.jpg", "secret", ROOT), null);
});

test("F2: resolveUploadPath keeps valid (including legacy) names inside the folder", () => {
  assert.equal(resolveUploadPath("3f2a.mp4", "", ROOT), path.join(ROOT, "3f2a.mp4"));
  assert.equal(resolveUploadPath("x_thumb.jpg", "thumbnails", ROOT), path.join(ROOT, "thumbnails", "x_thumb.jpg"));
  // Legacy names: uuid + raw extension of the client filename.
  assert.equal(resolveUploadPath("9c1e.MP 4", "", ROOT), path.join(ROOT, "9c1e.MP 4"));
  assert.equal(resolveUploadPath("a..b.mp4", "", ROOT), path.join(ROOT, "a..b.mp4"));
});

test("isSafeStoredName", () => {
  assert.equal(isSafeStoredName("abc.mp4"), true);
  assert.equal(isSafeStoredName("../abc"), false);
  assert.equal(isSafeStoredName(".env"), false);
});

test("generated stored names never carry client path components", () => {
  assert.equal(safeExtension("movie.MP4"), ".mp4");
  assert.equal(safeExtension("evil.php/../../x"), "");
  assert.equal(safeExtension("a.tar.gz"), ".gz");
  assert.equal(safeExtension("noext"), "");
  assert.equal(safeExtension("weird.mp 4"), "");
  const name = generateStoredName("../../../etc/passwd.mp4");
  assert.match(name, /^[0-9a-f-]{36}\.mp4$/);
  assert.notEqual(resolveUploadPath(name, "", ROOT), null);
});

/**
 * Regression tests for the critical (P0) audit findings F1–F4.
 * F5 (view fraud) has its own file: views.test.js.
 */
import { test, after, describe } from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  http, keyed, createUser, createAdmin, createFile, setSetting, one, uploadsPath, closeDb, pool,
} from "../helpers.js";
import { deleteFromStorage } from "../../src/utils/storage.js";

after(closeDb);

const SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../src");
const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true })
  .flatMap((e) => (e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]))
  .filter((f) => f.endsWith(".js"));

// ── F1: command injection ─────────────────────────────────────────────────────
describe("F1 /api/open-url command injection", () => {
  test("endpoint no longer exists (with or without a client key)", async () => {
    const payload = encodeURIComponent('http"; touch /tmp/vidora_pwned; echo "');
    const bare = await http().get(`/api/open-url?url=${payload}`);
    assert.equal(bare.status, 401); // rejected by the key guard before routing
    const withKey = await keyed(http().get(`/api/open-url?url=${payload}`));
    assert.notEqual(withKey.status, 200);
    assert.equal(fs.existsSync("/tmp/vidora_pwned"), false);
  });

  test("no source file runs commands through a shell", () => {
    for (const file of walk(SRC)) {
      const code = fs.readFileSync(file, "utf8");
      if (!code.includes("child_process")) continue;
      assert.doesNotMatch(code, /\bexec\s*\(|execSync\s*\(|spawn\([^)]*shell\s*:\s*true/, `${path.relative(SRC, file)} uses a shell`);
    }
  });
});

// ── F2: path traversal ────────────────────────────────────────────────────────
describe("F2 path traversal via stored_name", () => {
  test("POST /api/files (client-chosen stored_name) is gone", async () => {
    const user = await createUser();
    const res = await keyed(http().post("/api/files"), user.token)
      .send({ original_name: "x.mp4", stored_name: "../.env", mime_type: "video/mp4", storage_path: "x" });
    assert.equal(res.status, 410);
    const row = await one("SELECT COUNT(*) AS n FROM files WHERE user_id = ?", [user.id]);
    assert.equal(row.n, 0);
  });

  test("a legacy row pointing outside uploads is never served", async () => {
    // A file that exists right next to the uploads dir, standing in for backend/.env.
    const outside = path.join(path.dirname(uploadsPath()), "vidora-test-secret.env");
    fs.writeFileSync(outside, "JWT_SECRET=should-never-leak\n");
    try {
      const user = await createUser();
      for (const evil of ["../vidora-test-secret.env", "..%2Fvidora-test-secret.env", "/etc/hosts"]) {
        const f = await createFile(user.id, { storedName: evil });
        const res = await keyed(http().get(`/api/play/${f.id}`));
        assert.equal(res.status, 404, `play must refuse ${evil}`);
        assert.ok(!String(res.text).includes("JWT_SECRET"));
      }
    } finally {
      fs.rmSync(outside, { force: true });
    }
  });

  test("deleteFromStorage refuses to delete outside the uploads dir", async () => {
    const outside = path.join(path.dirname(uploadsPath()), "vidora-test-keep.txt");
    fs.writeFileSync(outside, "keep me");
    try {
      assert.equal(await deleteFromStorage("../vidora-test-keep.txt"), false);
      assert.equal(await deleteFromStorage("vidora-test-keep.txt", "../"), false);
      assert.equal(fs.existsSync(outside), true);
    } finally {
      fs.rmSync(outside, { force: true });
    }
  });

  test("real uploads get a server-generated name and stream back intact", async () => {
    const user = await createUser();
    const bytes = Buffer.from("fake-mp4-bytes-0123456789");
    const up = await keyed(http().post("/api/files/upload"), user.token)
      .attach("file", bytes, { filename: "../../evil name.MP4", contentType: "video/mp4" });
    assert.equal(up.status, 201, up.text);
    const file = up.body.data.file;
    assert.match(file.stored_name, /^[0-9a-f-]{36}\.mp4$/);
    assert.ok(fs.existsSync(uploadsPath(file.stored_name)));

    const play = await keyed(http().get(`/api/play/${file.id}`)).buffer(true).parse((res, cb) => {
      const chunks = []; res.on("data", (c) => chunks.push(c)); res.on("end", () => cb(null, Buffer.concat(chunks)));
    });
    assert.equal(play.status, 200);
    assert.deepEqual(play.body, bytes);
    assert.equal(play.headers["x-content-type-options"], "nosniff");
  });
});

// ── F3: settings leak ─────────────────────────────────────────────────────────
describe("F3 /api/settings exposes secrets", () => {
  test("only allowlisted public keys are returned, privately cached", async () => {
    await setSetting("smtp_pass", "SMTP-SECRET-VALUE");
    await setSetting("smtp_user", "mailer@example.test");
    await setSetting("storage_r2_secret_key", "R2-SECRET-VALUE");
    await setSetting("storage_b2_app_key", "B2-SECRET-VALUE");
    await setSetting("telegram_url", "https://t.me/vidora");

    const res = await keyed(http().get("/api/settings"));
    assert.equal(res.status, 200);
    assert.equal(res.body.data.telegram_url, "https://t.me/vidora");
    const body = JSON.stringify(res.body);
    for (const leaked of ["SMTP-SECRET-VALUE", "mailer@example.test", "R2-SECRET-VALUE", "B2-SECRET-VALUE"]) {
      assert.ok(!body.includes(leaked), `${leaked} leaked`);
    }
    assert.ok(Object.keys(res.body.data).every((k) => !k.startsWith("storage_") && !k.startsWith("smtp_")));
    assert.match(res.headers["cache-control"], /private/);
  });

  test("admin settings are masked, and saving a masked value keeps the stored secret", async () => {
    await setSetting("smtp_pass", "SMTP-SECRET-VALUE");
    const admin = await createAdmin();

    const list = await keyed(http().get("/api/admin/settings"), admin.token);
    const smtp = list.body.data.settings.find((s) => s.id === "smtp_pass");
    assert.ok(smtp.value.startsWith("••••••••"));
    assert.ok(!JSON.stringify(list.body).includes("SMTP-SECRET-VALUE"));

    await keyed(http().put("/api/admin/settings"), admin.token).send({ settings: { smtp_pass: smtp.value, telegram_url: "https://t.me/new" } });
    assert.equal((await one("SELECT value FROM app_settings WHERE id='smtp_pass'")).value, "SMTP-SECRET-VALUE");
    assert.equal((await one("SELECT value FROM app_settings WHERE id='telegram_url'")).value, "https://t.me/new");

    await keyed(http().put("/api/admin/settings"), admin.token).send({ settings: { smtp_pass: "NEW-PASS" } });
    assert.equal((await one("SELECT value FROM app_settings WHERE id='smtp_pass'")).value, "NEW-PASS");

    const storage = await keyed(http().get("/api/admin/storage"), admin.token);
    assert.ok(!JSON.stringify(storage.body).includes("B2-SECRET-VALUE"));
  });
});

// ── F4: API key bypass ────────────────────────────────────────────────────────
describe("F4 API key bypass via Origin/Referer", () => {
  test("forged Origin / Referer headers do not replace the key", async () => {
    const cases = [
      {},
      { Origin: "http://localhost:8080" },
      { Referer: "http://localhost:8080/dashboard" },
      { Referer: "http://localhost:8080.evil.example/x" },
    ];
    for (const headers of cases) {
      const res = await http().get("/api/settings").set(headers);
      assert.equal(res.status, 401, `headers ${JSON.stringify(headers)} must not bypass the key`);
    }
  });

  test("keys are not accepted from the query string; invalid keys are 403", async () => {
    assert.equal((await http().get("/api/settings?api_key=test_web_key")).status, 401);
    assert.equal((await http().get("/api/settings").set("X-API-Key", "nope")).status, 403);
    assert.equal((await keyed(http().get("/api/settings"))).status, 200);
    assert.equal((await http().get("/api/settings").set("X-API-Key", "test_mobile_key")).status, 200);
  });

  test("protected data still needs a user token even with a valid key", async () => {
    assert.equal((await keyed(http().get("/api/users/profile"))).status, 401);
    assert.equal((await keyed(http().get("/api/admin/stats"))).status, 401);
  });
});

/**
 * P2a reset codes, N4 login disclosure, N2 admin credential changes,
 * P2b image upload validation.
 *
 * TRUST_PROXY=1 lets each request present its own client IP, so the per-IP
 * limiter on the reset endpoints doesn't mask the per-code attempt limit.
 */
process.env.TRUST_PROXY = "1";

const { test, after, describe } = await import("node:test");
const assert = (await import("node:assert/strict")).default;
const crypto = await import("crypto");
const fs = await import("fs");
const bcrypt = (await import("bcryptjs")).default;
const { http, keyed, createUser, createAdmin, one, closeDb, pool, uploadsPath } = await import("../helpers.js");
const { config } = await import("../../src/config.js");
const { generateResetCode, RESET_CODE_MAX_ATTEMPTS } = await import("../../src/controllers/auth.controller.js");

after(closeDb);

let ipCounter = 0;
const freshIp = () => `198.18.${Math.floor(++ipCounter / 250)}.${ipCounter % 250 + 1}`;
const asNewClient = (req) => req.set("X-Forwarded-For", freshIp());

const hmac = (userId, code) => crypto.createHmac("sha256", config.jwt.secret).update(`${userId}:${code}`).digest("hex");

async function issueCode(user, code = "123456", minutes = 15) {
  await pool.query("DELETE FROM password_resets WHERE user_id = ?", [user.id]);
  await pool.query(
    "INSERT INTO password_resets (id, user_id, otp, expires_at) VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL ? MINUTE))",
    [crypto.randomUUID(), user.id, hmac(user.id, code), minutes]
  );
  return code;
}

const reset = (user, otp, newPassword = "BrandNewPass1!") =>
  asNewClient(keyed(http().post("/api/auth/reset-password"))).send({ email: user.email, otp, newPassword });

describe("P2a password reset codes", () => {
  test("codes come from a CSPRNG: always 6 digits, leading zeros kept, no repeats in a sample", () => {
    const sample = Array.from({ length: 2000 }, generateResetCode);
    assert.ok(sample.every((c) => /^\d{6}$/.test(c)));
    assert.ok(new Set(sample).size > 1990);
  });

  test("forgot-password stores only a keyed hash of the code", async () => {
    const user = await createUser();
    const res = await asNewClient(keyed(http().post("/api/auth/forgot-password"))).send({ email: user.email });
    assert.equal(res.status, 200);
    const row = await one("SELECT otp FROM password_resets WHERE user_id = ?", [user.id]);
    assert.match(row.otp, /^[0-9a-f]{64}$/);
  });

  test(`a code is locked after ${RESET_CODE_MAX_ATTEMPTS} wrong guesses — even the right code then fails`, async () => {
    const user = await createUser();
    const code = await issueCode(user);
    const statuses = [];
    for (let i = 0; i < RESET_CODE_MAX_ATTEMPTS; i++) statuses.push((await reset(user, "000000")).body.code);
    assert.equal(statuses.at(-1), "OTP_ATTEMPTS_EXCEEDED");
    const late = await reset(user, code);
    assert.equal(late.status, 400);
    const stored = await one("SELECT password_hash FROM users WHERE id = ?", [user.id]);
    assert.equal(await bcrypt.compare(user.password, stored.password_hash), true, "password unchanged");
  });

  test("the right code resets the password once, signs out other sessions, and can't be reused", async () => {
    const user = await createUser();
    await pool.query("INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL 1 DAY))",
      [crypto.randomUUID(), user.id, crypto.randomBytes(16).toString("hex")]);
    const code = await issueCode(user);
    assert.equal((await reset(user, code)).status, 200);
    const stored = await one("SELECT password_hash FROM users WHERE id = ?", [user.id]);
    assert.equal(await bcrypt.compare("BrandNewPass1!", stored.password_hash), true);
    assert.equal(Number((await one("SELECT COUNT(*) n FROM refresh_tokens WHERE user_id = ?", [user.id])).n), 0);
    assert.equal((await reset(user, code, "AnotherPass1!")).status, 400, "single use");
  });

  test("expired codes are refused", async () => {
    const user = await createUser();
    const code = await issueCode(user, "654321", -1);
    assert.equal((await reset(user, code)).status, 400);
  });
});

describe("N4 login doesn't disclose account state to non-owners", () => {
  test("a banned account answers 401 to a wrong password and 403 only to the right one", async () => {
    const user = await createUser({ isActive: 0 });
    const login = (password) => asNewClient(keyed(http().post("/api/auth/login"))).send({ email: user.email, password });
    assert.equal((await login("wrong-password")).status, 401);
    const right = await login(user.password);
    assert.equal(right.status, 403);
    assert.equal(right.body.code, "ACCOUNT_BANNED");
  });

  test("unknown emails get the same 401 as wrong passwords", async () => {
    const res = await asNewClient(keyed(http().post("/api/auth/login"))).send({ email: "nobody-here@example.test", password: "whatever1" });
    assert.equal(res.status, 401);
    assert.equal(res.body.message, "Invalid email or password.");
  });
});

describe("N2 admin credential changes need the current password", () => {
  test("email change without / with a wrong / with the right password", async () => {
    const admin = await createAdmin();
    const update = (body) => keyed(http().patch("/api/admin/auth/update"), admin.token).send(body);
    const newEmail = `moved_${crypto.randomBytes(3).toString("hex")}@example.test`;
    assert.equal((await update({ email: newEmail })).status, 400);
    assert.equal((await update({ email: newEmail, currentPassword: "wrong" })).status, 401);
    assert.equal((await one("SELECT email FROM admins WHERE id = ?", [admin.id])).email, admin.email);
    assert.equal((await update({ email: newEmail, currentPassword: admin.password })).status, 200);
    assert.equal((await one("SELECT email FROM admins WHERE id = ?", [admin.id])).email, newEmail);
  });
});

describe("P2b image uploads", () => {
  const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), crypto.randomBytes(64)]);
  const avatarsBefore = () => new Set(fs.readdirSync(uploadsPath("avatars")));

  test("script content disguised as an image is rejected and deleted", async () => {
    const user = await createUser();
    const before = avatarsBefore();
    const res = await keyed(http().post("/api/users/avatar"), user.token)
      .attach("avatar", Buffer.from("alert(document.cookie)"), { filename: "evil.js", contentType: "image/png" });
    assert.equal(res.status, 400);
    assert.deepEqual(new Set(fs.readdirSync(uploadsPath("avatars"))), before);
  });

  test("SVG and HTML are not accepted as images", async () => {
    const user = await createUser();
    for (const [name, type] of [["x.svg", "image/svg+xml"], ["x.html", "text/html"]]) {
      const res = await keyed(http().post("/api/users/avatar"), user.token)
        .attach("avatar", Buffer.from("<svg onload=alert(1)>"), { filename: name, contentType: type });
      assert.equal(res.status, 400, name);
    }
  });

  test("a real PNG is stored with a server-chosen extension and served sandboxed", async () => {
    const user = await createUser();
    const res = await keyed(http().post("/api/users/avatar"), user.token)
      .attach("avatar", PNG, { filename: "../../me.php", contentType: "image/png" });
    assert.equal(res.status, 200, res.text);
    assert.match(res.body.data.avatar_url, /^\/avatars\/avatar_[0-9a-f-]{36}\.png$/);
    const served = await http().get(res.body.data.avatar_url);
    assert.equal(served.status, 200);
    assert.equal(served.headers["content-type"], "image/png");
    assert.equal(served.headers["x-content-type-options"], "nosniff");
    assert.match(served.headers["content-security-policy"], /sandbox/);
  });
});

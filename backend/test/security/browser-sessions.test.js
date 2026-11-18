import { test, after } from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
import { http, keyed, createUser, createAdmin, closeDb } from "../helpers.js";
import { config } from "../../src/config.js";

after(closeDb);
const ORIGIN = "http://localhost:8080";
const browser = (req) => keyed(req).set("Origin", ORIGIN).set("X-Session-Mode", "browser");
const cookieOf = (res) => res.headers["set-cookie"]?.[0]?.split(";")[0];
const csrfHeader = (token) => ({ "X-CSRF-Token": token });

test("browser login, reload restoration, access expiry, and cookie rotation", async () => {
  const user = await createUser();
  const login = await browser(http().post("/api/auth/login")).send({ email: user.email, password: user.password });
  assert.equal(login.status, 200, login.text);
  assert.ok(cookieOf(login)?.startsWith("vidora_user_rt="));
  assert.match(login.headers["set-cookie"][0], /HttpOnly; SameSite=Lax/);
  assert.ok(!("refreshToken" in login.body.data));
  assert.ok(!JSON.stringify(login.body).includes(cookieOf(login).split("=")[1]));
  const claims = jwt.decode(login.body.data.accessToken);
  assert.ok(claims.exp - claims.iat <= 600);

  // Simulate a new tab/reload: only the HttpOnly cookie is carried forward.
  const csrf = await browser(http().get("/api/auth/browser-csrf")).set("Cookie", cookieOf(login));
  assert.equal(csrf.status, 200);
  const refresh = await browser(http().post("/api/auth/refresh"))
    .set("Cookie", cookieOf(login)).set(csrfHeader(csrf.body.data.csrfToken));
  assert.equal(refresh.status, 200);
  assert.equal(refresh.body.data.user.id, user.id);
  assert.notEqual(cookieOf(refresh), cookieOf(login));
  assert.equal((await keyed(http().get("/api/auth/me"), refresh.body.data.accessToken)).status, 200);

  const expired = jwt.sign({ id: user.id, email: user.email, role: "creator", sid: claims.sid, exp: Math.floor(Date.now() / 1000) - 1 },
    config.jwt.secret, { algorithm: "HS256" });
  assert.equal((await keyed(http().get("/api/auth/me"), expired)).body.code, "TOKEN_EXPIRED");
  const next = await browser(http().post("/api/auth/refresh"))
    .set("Cookie", cookieOf(refresh)).set(csrfHeader(refresh.body.data.csrfToken));
  assert.equal(next.status, 200);
  assert.equal((await keyed(http().get("/api/auth/me"), next.body.data.accessToken)).status, 200);

  // A stale tab cannot replay a rotated cookie. It can use the browser's new cookie.
  const replay = await browser(http().post("/api/auth/refresh"))
    .set("Cookie", cookieOf(login)).set(csrfHeader(login.body.data.csrfToken));
  assert.equal(replay.status, 401);
});

test("browser refresh and logout enforce CSRF and trusted Origin", async () => {
  const user = await createUser();
  const login = await browser(http().post("/api/auth/login")).send({ email: user.email, password: user.password });
  const cookie = cookieOf(login);
  const csrf = login.body.data.csrfToken;
  assert.equal((await browser(http().post("/api/auth/refresh")).set("Cookie", cookie)).status, 403);
  assert.equal((await browser(http().post("/api/auth/logout")).set("Cookie", cookie).set(csrfHeader("x".repeat(43)))).status, 403);
  assert.equal((await keyed(http().post("/api/auth/refresh")).set("X-Session-Mode", "browser")
    .set("Cookie", cookie).set(csrfHeader(csrf))).status, 403);
  assert.equal((await keyed(http().post("/api/auth/login")).set("X-Session-Mode", "browser")
    .set("Origin", "https://attacker.invalid").send({ email: user.email, password: user.password })).status, 403);
  assert.equal((await browser(http().get("/api/auth/browser-csrf")).set("Cookie", cookie)).status, 200);

  const logout = await browser(http().post("/api/auth/logout")).set("Cookie", cookie).set(csrfHeader(csrf));
  assert.equal(logout.status, 200);
  assert.match(logout.headers["set-cookie"][0], /Max-Age=0/);
  assert.equal((await keyed(http().get("/api/auth/me"), login.body.data.accessToken)).status, 401);
  assert.equal((await browser(http().get("/api/auth/browser-csrf")).set("Cookie", cookie)).status, 401);
});

test("parallel refresh uses a token once and another tab can continue with rotated cookie", async () => {
  const user = await createUser();
  const login = await browser(http().post("/api/auth/login")).send({ email: user.email, password: user.password });
  const requests = await Promise.all(Array.from({ length: 5 }, () =>
    browser(http().post("/api/auth/refresh")).set("Cookie", cookieOf(login))
      .set(csrfHeader(login.body.data.csrfToken))));
  assert.equal(requests.filter((r) => r.status === 200).length, 1);
  const rotated = requests.find((r) => r.status === 200);
  const nextTab = await browser(http().get("/api/auth/browser-csrf")).set("Cookie", cookieOf(rotated));
  assert.equal(nextTab.status, 200);
  assert.equal((await browser(http().post("/api/auth/refresh")).set("Cookie", cookieOf(rotated))
    .set(csrfHeader(nextTab.body.data.csrfToken))).status, 200);
});

test("admin session is isolated, restorable, and immediately revoked on logout", async () => {
  const user = await createUser();
  const admin = await createAdmin();
  const userLogin = await browser(http().post("/api/auth/login")).send({ email: user.email, password: user.password });
  assert.equal((await keyed(http().get("/api/admin/stats"), userLogin.body.data.accessToken)).status, 403);
  assert.equal((await browser(http().get("/api/admin/auth/browser-csrf")).set("Cookie", cookieOf(userLogin))).status, 401);
  assert.equal((await keyed(http().get("/api/admin/stats"))).status, 401);

  const login = await browser(http().post("/api/admin/auth/login")).send({ email: admin.email, password: admin.password });
  assert.equal(login.status, 200, login.text);
  assert.ok(cookieOf(login).startsWith("vidora_admin_rt="));
  assert.ok(!("refreshToken" in login.body.data));
  assert.equal((await keyed(http().get("/api/admin/stats"), login.body.data.token)).status, 200);
  const csrf = await browser(http().get("/api/admin/auth/browser-csrf")).set("Cookie", cookieOf(login));
  assert.equal(csrf.status, 200);
  assert.equal((await browser(http().post("/api/admin/auth/refresh")).set("Cookie", cookieOf(login))).status, 403);
  const refreshed = await browser(http().post("/api/admin/auth/refresh"))
    .set("Cookie", cookieOf(login)).set(csrfHeader(csrf.body.data.csrfToken));
  assert.equal(refreshed.status, 200);
  const logout = await browser(http().post("/api/admin/auth/logout"))
    .set("Cookie", cookieOf(refreshed)).set(csrfHeader(refreshed.body.data.csrfToken));
  assert.equal(logout.status, 200);
  assert.equal((await keyed(http().get("/api/admin/stats"), refreshed.body.data.token)).status, 401);
  assert.equal((await keyed(http().get("/api/auth/me"), userLogin.body.data.accessToken)).status, 200);
});

test("mobile bearer login and JSON refresh contract remain compatible", async () => {
  const user = await createUser();
  const login = await keyed(http().post("/api/auth/login")).send({ email: user.email, password: user.password });
  assert.equal(login.status, 200);
  assert.ok(login.body.data.refreshToken);
  assert.equal(login.headers["set-cookie"], undefined);
  const refresh = await keyed(http().post("/api/auth/refresh")).send({ refreshToken: login.body.data.refreshToken });
  assert.equal(refresh.status, 200);
  assert.equal((await keyed(http().post("/api/auth/refresh")).send({ refreshToken: login.body.data.refreshToken })).status, 401);
  assert.equal((await keyed(http().get("/api/auth/me"), refresh.body.data.accessToken)).status, 200);
  assert.equal((await keyed(http().post("/api/auth/logout")).send({ refreshToken: refresh.body.data.refreshToken })).status, 200);
  assert.equal((await keyed(http().post("/api/auth/refresh")).send({ refreshToken: refresh.body.data.refreshToken })).status, 401);
});

test("browser signup receives only cookie-backed refresh and can restore session", async () => {
  const email = `new-${Date.now()}@example.test`;
  const signup = await browser(http().post("/api/auth/register"))
    .send({ name: "Browser User", email, password: "StrongPassword123!" });
  assert.equal(signup.status, 201, signup.text);
  assert.ok(cookieOf(signup)?.startsWith("vidora_user_rt="));
  assert.ok(!("refreshToken" in signup.body.data));
  const restored = await browser(http().post("/api/auth/refresh"))
    .set("Cookie", cookieOf(signup)).set(csrfHeader(signup.body.data.csrfToken));
  assert.equal(restored.status, 200);
  assert.equal(restored.body.data.user.email, email);
});

test("browser impersonation uses a user cookie and preserves admin attribution", async () => {
  const user = await createUser(), admin = await createAdmin();
  const login = await browser(http().post("/api/admin/auth/login"))
    .send({ email: admin.email, password: admin.password });
  const impersonate = await browser(http().post(`/api/admin/impersonate/${user.id}`))
    .set("Authorization", `Bearer ${login.body.data.token}`);
  assert.equal(impersonate.status, 200);
  assert.ok(cookieOf(impersonate)?.startsWith("vidora_user_rt="));
  assert.ok(!("accessToken" in impersonate.body.data));
  const csrf = await browser(http().get("/api/auth/browser-csrf")).set("Cookie", cookieOf(impersonate));
  const restored = await browser(http().post("/api/auth/refresh")).set("Cookie", cookieOf(impersonate))
    .set(csrfHeader(csrf.body.data.csrfToken));
  assert.equal(restored.status, 200);
  assert.equal(jwt.decode(restored.body.data.accessToken).imp, admin.id);
});

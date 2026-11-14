# Vidora — Security Remediation Report

**Date:** 2026-11-14 · **Branch:** `security/remediation` (8 commits on top of `819a8e3`, not pushed)
**Scope:** `backend/` (Node/Express API), `web_dashboard/` (TanStack Start), `vidora-andoid/` (Android), `src-tauri/` + `dist/` (desktop shell), CI.

> **Assurance statement.** This report describes code-level fixes, each backed by automated regression tests and, for the critical and high findings, by re-running the original exploits against the fixed build. It is **not** a penetration test or an independent security assessment, and passing tests do not mean the application is secure or production-ready. Before launch, Vidora still needs an independent review, credential rotation, and the operational steps in the deployment checklist (§9).

---

## 1. Summary

| | |
|---|---|
| Findings in the original audit | 31 (5 critical, 7 high, 9 medium, 10 low / functional) |
| Confirmed against the code | 31 of 31 (two re-scoped: F3 broader, P2b lower impact) |
| Reproduced at runtime before fixing | 15 (isolated copy of the database) |
| New issues found during remediation | 9 (N1–N9), all fixed |
| Original exploits blocked after fixing | 13 of 13 re-run |
| Automated tests | Backend 102 · Android 6 (5 security) · desktop (Rust) 3 · browser end-to-end 1, all passing |
| Dependency audit, production | Backend 30 → **0** · web 15 → **0** |

---

## 2. How the findings were verified

1. **Code review.** Every finding was traced to its source lines.
2. **Isolated runtime proof.**
   * The dev schema was copied (`mysqldump --no-data`) into a throwaway database, `videora_audit_scratch`.
   * The original server ran against it on a separate port, with the Telegram bot and Firebase disabled.
   * The development database `videora` was only read: the schema dump, plus checking *whether* settings had values, never what they were.
3. **Before and after.** The same proof-of-concept was re-run against the remediated build (§6.3).
4. **Regression tests.** Each confirmed finding has a test that fails on the vulnerable behaviour. Tests run against a dedicated `*_test` database. The test harness refuses any database name that doesn't end in `_test`, and that guard fired once during development, blocking an accidental run against `videora`.

---

## 3. Findings: verification, severity and status

"Runtime" means reproduced against the isolated server. "Code" means confirmed by reading the code or by an isolated check.

### Critical (P0)

| ID | Finding | Verification evidence | Status |
|---|---|---|---|
| F1 | Unauthenticated command injection in `GET /api/open-url` (`exec` of a query string, server bound to `0.0.0.0`) | **Runtime:** an injected `touch` ran on the host, with no key and no auth | Fixed |
| F2 | Path traversal: client-chosen `stored_name` used in `/api/play`, stream and delete paths | **Runtime:** `stored_name: "../.env"` → `/api/play` returned `.env`, including `JWT_SECRET` | Fixed |
| F3 | `GET /api/settings` returned every `app_settings` row: storage keys **and SMTP username and password**, sent with `Cache-Control: public` | **Runtime:** seeded secrets came back. The dev database holds real SMTP and Backblaze B2 credentials | Fixed (rotate credentials, §9) |
| F4 | API-key check skipped when `Origin`/`Referer` matched a frontend origin. A look-alike prefix (`localhost:8080.evil…`) also matched. Live keys were committed | **Runtime:** `curl` with a forged `Origin` → 200 | Fixed |
| F5 | Paid views deduplicated only by the client-controlled `X-Forwarded-For` header | **Runtime:** 5 forged IPs → 5 paid views | Fixed |

### High (P1)

| ID | Finding | Evidence | Status |
|---|---|---|---|
| F6 | Payout race: balance checked, then inserted, with no transaction | **Runtime:** $10 balance, 10 parallel requests → 2 accepted | Fixed |
| F7 | Purge deleted a physical file shared by reference copies | **Runtime:** owner's file deleted; owner's row still `active` | Fixed |
| F8 | Any file copyable by raw ID (IDs are public); the copier earned from views | **Runtime:** a never-shared file was copied → 201 | Fixed |
| F9 | Bot uploads written to disk (up to 10 GB) before authentication, never cleaned up | **Runtime:** bogus key → 403, file left on disk | Fixed |
| F10 | No admin login rate limit (only the global 200 per 15 minutes) | **Runtime:** 15 bad logins → 0 throttled | Fixed |
| F11 | `migrate.js` created 8 of the 20 tables the code uses | **Runtime:** a fresh database got 8 tables | Fixed |
| F12 | Vulnerable dependencies (backend 30, 4 critical; web 15, 6 critical) | `npm audit` | Fixed (production) |

### Medium (P2)

| ID | Finding | Evidence | Status |
|---|---|---|---|
| P2a | Reset code from `Math.random`, stored in plain text, no attempt limit | Code | Fixed |
| P2b | Avatar and receipt uploads keep the client's extension and trust the client's MIME type. Impact is lower than first reported: the API origin holds no session tokens | **Runtime:** `evil.js` labelled `image/png` was served as `application/javascript` | Fixed |
| P2c | `trust proxy` not configured | Code | Fixed |
| P2d | Re-completing a payout paid the referral bonus again | **Runtime:** 3 completions → $15 instead of $5 | Fixed |
| P2e | Changing the earning rate re-priced all historical views | Code | Fixed |
| P2f | Android: cleartext traffic, auth tokens in backups (backup rules malformed), hardcoded LAN IPs | Code | Fixed |
| P2g | Tauri `csp: null`; remote URL loaded without restriction | Code | Fixed |
| P2h | Placeholder-looking JWT secrets; no production config validation | Code (pattern check; values never printed) | Fixed |

### Low and functional (P3)

| ID | Finding | Evidence | Status |
|---|---|---|---|
| P3a | Share stream URL pointed at a route that didn't exist | **Runtime** (returned 401 because of N1) | Fixed |
| P3b | Bunny CDN streaming crashed (`.pipe` on a web stream) and had no Range support | Code (`fetch().body.pipe === undefined`) | Fixed (mock-tested) |
| P3c | Cloud uploads read the whole file into memory; files over 2 GB fail (`ERR_FS_FILE_TOO_LARGE`) | Code | Fixed |
| P3d | Suffix ranges (`bytes=-N`) caused a 500 | **Runtime** | Fixed |
| P3e | Expired tokens never pruned | Code | Fixed |
| P3f | AdMob: real app ID alongside test unit IDs | Code | Fixed |
| P3g | `vidora-desktop` gitlink with no `.gitmodules`; 16 MB of installers committed | Code | Fixed (history not rewritten) |
| P3h | No backend or Android CI | Code | Fixed |
| P3i | Admin impersonation not logged | Code | Fixed |

### Found during remediation

| ID | Issue | Severity | Status |
|---|---|---|---|
| N1 | The subscription router, mounted at `/api` with a router-wide `authenticate`, turned every unknown `/api/*` path into a 401 | Low | Fixed |
| N2 | Admin email change didn't need the current password | Low | Fixed |
| N3 | Legacy `/api/share/media` endpoint: HMAC fallback secret `"secret"`, timing-unsafe compare, unescaped `Content-Disposition`, traversal sink. Nothing generated its signatures | Low | Removed |
| N4 | Login revealed banned status before checking the password; response timing revealed registered emails | Low | Fixed |
| N5 | `notifications.type` lacked `'subscription'`, so subscriber notifications always failed silently | Low (functional) | Fixed |
| N6 | **Refresh-token rotation never worked.** Tokens were bcrypt-hashed, and bcrypt reads only the first 72 bytes, which all of a user's JWTs share. Any of a user's refresh tokens matched any stored hash, so a stolen token stayed valid until a password change. Found by the new authorization suite | **Medium** | Fixed |
| N7 | Paste-link screen crashed whenever ads were enabled (`adUnitId` set in XML and again in code) | Low (functional) | Fixed |
| N8 | Breaking changes caught while upgrading dependencies: `firebase-admin` 14 removed the namespaced API (push would have crashed); `node-telegram-bot-api` 2.x is a full rewrite with no default export (the bot would have crashed) | — | Handled (§7) |
| N9 | Access logs recorded verification tokens (query string) and stream tokens (path) | Low | Fixed |

---

## 4. Remediation details

### F1: command injection
* **Root cause:** a desktop convenience endpoint ran `open "<url>"` through a shell on the *server*.
* **Fix:**
  * The endpoint and the dashboard's click interceptor are removed.
  * External links in the desktop app are now handled by a Tauri navigation guard ([src-tauri/src/lib.rs](src-tauri/src/lib.rs)) on the user's own machine. Only `https` pages on trusted hosts load in-app (`VIDORA_TRUSTED_HOSTS`, default `vidora.app`); everything else opens in the system browser.
  * `ffmpeg` now runs via `execFile`.
* **Tests:**
  * The endpoint is gone.
  * A static check fails if any source file uses `exec`, `execSync` or `shell: true`.
  * 3 Rust tests cover the URL allowlist.

### F2: path traversal
* **Root cause:** `stored_name` was trusted and concatenated into filesystem paths.
* **Fix:**
  * [utils/paths.js](backend/src/utils/paths.js) `resolveUploadPath()` rejects separators, NUL bytes and leading dots, and checks that the resolved path sits directly inside the uploads folder. Every read, write and delete goes through it, including cloud object keys.
  * Stored names are server-generated: a UUID plus a sanitised extension.
  * The legacy metadata endpoint `POST /api/files` now returns **410**.
* **Tests:** traversal, legacy-row, delete-outside-root and upload-round-trip tests (unit and integration).

### F3: settings exposure
* **Fix:**
  * Explicit allowlist of public keys ([utils/settings.js](backend/src/utils/settings.js)), served with `Cache-Control: private`.
  * Admin responses mask credentials (`••••••••abcd`), and a masked value sent back unchanged is ignored on save.
* **Tests:** seeded secrets absent; masking round-trip.

### F4: API-key model
* **Fix:**
  * Keys are documented and treated as **public client identifiers**. Authorization comes from user JWTs, admin JWTs, per-user bot keys and rate limits.
  * `Origin`/`Referer` no longer bypass the check, and keys are accepted only in the `X-API-Key` header.
  * The web dashboard sends `VITE_API_KEY`.
  * Live keys removed from source and docs (Android now uses `BuildConfig`).
* **Tests:** forged headers → 401, query-string key → 401, invalid key → 403.

### F5: view fraud
Design chosen with the product owner: signed view tickets.
* **Flow:** `POST /api/view/:token/ticket` at playback start returns a one-time ticket (only its SHA-256 is stored). The client redeems it with `POST /api/view/:token {ticket}` after the server-defined minimum watch time (10 s video, 3 s image; configurable).
* **The server decides:**
  * who the viewer is: user ID if signed in, otherwise `req.ip`, which honours `TRUST_PROXY`
  * that the viewer isn't the owner or payee
  * one counted view per viewer, per file, per UTC day, enforced atomically by a primary key
  * a per-viewer daily cap
* **Audit trail:** every attempt is written to `view_events` with its reason.
* **Clients:** Android uses the shared [ViewTracker](vidora-andoid/app/src/main/java/com/mynk/vidora/utils/ViewTracker.java).
* **Tests:** 12 cases (forged IPs, timing, replay, expiry, self-view, concurrency, cap, audit).

### F6, P2d, P2e: money integrity
* [services/earnings.service.js](backend/src/services/earnings.service.js) is now the only balance calculation. Before, the summary, the payout check and the admin view each used their own formula, and they disagreed about `processing` payouts.
* Payout requests run in a transaction holding a row lock on the user (`SELECT … FOR UPDATE`). Amounts are rounded down to whole cents.
* Payout status changes are locked and follow a state machine (`completed` is terminal). The referral bonus is unique per payout at the database level, and notifications fire once per real transition.
* Migration 003 freezes existing views at the current rate (`legacy_views` + `legacy_earning_rate`). Every new counted view is credited to an earnings ledger at that day's rate.
* **Tests:** concurrency, rounding, state machine, rate change, purge preservation, and an upgrade test proving balances don't change across migration 003.

### F7, F8: purge and copy
* **Purge:** an object is deleted only when no row references its `stored_name` or thumbnail, and only after the database commit.
* **Copy** ([services/file-copy.service.js](backend/src/services/file-copy.service.js), shared by the API and the bot):
  * requires an active share link
  * records `source_file_id` and `payee_user_id`, so views pay the original uploader (product decision)
  * refuses re-copying your own file

### F9, F10: uploads and brute force
* **Uploads:** bot uploads are authenticated before multer runs. Failed or aborted uploads are deleted. Per-user upload rate limit; oversize files get 413.
* **Brute force:** admin login is limited per IP (10) and per target email (5 failures per 15 minutes). User login also gets a per-email limit.

### F11: migrations
* Versioned runner with checksums and tamper detection (`npm run db:migrate`, `db:migrate:status`).
* `001_baseline.sql` reproduces the real 20-table schema idempotently (`IF NOT EXISTS`); 002–005 are additive.
* Verified on a fresh database, on re-runs, and on a copy of the real dev schema.

### P2a, P2b, N2, N4, N6: authentication hardening
* **Reset codes:** generated with `crypto.randomInt`, stored as `HMAC(secret, userId:code)`, compared in constant time, and burned after 5 wrong attempts.
* **Images:** only JPEG, PNG, GIF and WebP; server-chosen extension; magic-byte check.
* **Refresh tokens:** stored as SHA-256 digests with exact lookup; rotation is atomic.
* **All JWTs:** carry a `jti`; algorithm pinned to HS256.

### P2f, P3f: Android
* Release network security config refuses cleartext; a debug-only override allows local development.
* Token preferences excluded from both backup mechanisms.
* URLs, client key and AdMob app ID come from `BuildConfig` and manifest placeholders, fed by `local.properties`, Gradle properties or environment variables.
* Release builds reject a non-HTTPS Remote Config `base_url`.
* Share deep links are bound to the web host instead of any host.
* Debug builds use only Google's test ad IDs.
* **Tests:** JVM test `SecurityConfigTest` (5 cases).

### P3 reliability
* Range-aware streaming for local disk, S3/R2/B2 and Bunny.
* Multipart streamed uploads (`@aws-sdk/lib-storage`); Bunny uploads streamed with a `Content-Length`.
* Hourly batched cleanup job ([jobs/cleanup.js](backend/src/jobs/cleanup.js)).
* Admin audit log (migration 005, `GET /api/admin/audit-log`). Impersonation tokens carry an `imp` claim naming the admin. Settings changes log key names only, never values.

---

## 5. API and client compatibility

| Change | Who is affected |
|---|---|
| `POST /api/view/:token` now needs a ticket (`VIEW_TICKET_REQUIRED` otherwise) | **Android versions older than this branch stop generating paid views** until users update |
| `X-API-Key` required from the web (no `Origin` bypass); `?api_key=` no longer accepted | Web needs `VITE_API_KEY` (your local `web_dashboard/.env` has been updated) |
| `POST /api/files` → 410; `/api/open-url` and `/api/share/media/:id` removed | No client used them |
| `/api/files/copy` accepts only share links | Copy by raw file ID no longer works (intended) |
| Refresh tokens re-hashed | Every user signs in again once after deployment |
| Outstanding reset codes invalidated (migration 004) | Users request a new code |
| Admin profile changes need the current password | Admin UI updated |
| New: `GET /api/stream/:token/video` (no key; the token is the capability), `/api/view/:token/ticket`, `/api/admin/audit-log` | — |

All other routes and response shapes are unchanged. A browser end-to-end run logged in through the real form and loaded Dashboard, Files and Earnings: 23 of 23 API calls returned 200, each carrying `X-API-Key`, with no console errors.

---

## 6. Tests and results

### 6.1 Automated suites
| Suite | Result |
|---|---|
| Backend `npm test` (`node:test` + supertest, MySQL `videora_test`) | **102 / 102 pass** |
| Android `:app:testDebugUnitTest` (`SecurityConfigTest` + example test) | **6 / 6 pass**; debug APK and release variant compile |
| Desktop `cargo test --lib` (navigation guard) | **3 / 3 pass** |
| Browser end-to-end (login → dashboard, files, earnings) | **Pass**, 0 failed requests, 0 console errors |

Backend test areas: P0 critical (F1–F4), views (F5, 12 cases), money (F6/F7/F8/F10/P2d/P2e), trusted proxy, authentication hardening (P2a/P2b/N2/N4), authorization and IDOR (including N6), media and Range, migrations (fresh, idempotent, tamper, upgrade), notifications (N5), reliability (cleanup, audit, N1), unit tests (paths, Range parsing, config validation, Bunny adapter).

### 6.2 Coverage (`npm run test:coverage`, backend `src/`)
Overall: **70.6 % lines, 68.7 % branches, 66.7 % functions.**

* **High:** `paths` 100 %, `settings` 100 %, `file-lookup` 100 %, earnings service 99 %, view controller 97 %, file-copy service 97 %, auth middleware 93 %, auth controller 89 %.
* **Gaps:** admin controller 31 %, user controller 13 %, payment controller 15 %, storage 57 % (the S3/R2/B2 paths need a real provider), firebase 59 %.

### 6.3 Original exploits re-run against the fixed build
The proof-of-concept was re-run with the attacker holding the public mobile key (which ships in the APK). Every attack is now blocked:

* **F1:** injected command doesn't run.
* **F2:** `POST /api/files` returns 410; a pre-existing `../.env` row returns 404 and no secret.
* **F3:** seeded secrets absent; `Cache-Control: private`.
* **F4:** forged `Origin` and look-alike `Referer` both get 401.
* **F5:** old-style spoofed calls count 0 views; ticketed calls with forged IPs count 1.
* **F6:** 10 parallel $10 requests → 1 accepted.
* **F7:** owner's file survives the purge.
* **F8:** copy by raw ID → 404.
* **F9:** no file left on disk.
* **F10:** 10 of 15 bad logins throttled.
* **P2d:** one referral credit.
* **P3:** suffix range → 206; stream URL → 200.

---

## 7. Dependency audit

| Project | Before | After |
|---|---|---|
| backend, production and dev | 30 (4 critical, 7 high) | **0** |
| web_dashboard, production | 15 (6 critical, 7 high) | **0** |
| web_dashboard, dev only | — | 7 moderate (`minimatch` via `typescript-eslint`; lint tooling, never shipped) |

**Backend changes:**
* Patched `axios`, `express`, `multer`, `mysql2`, `morgan`, `form-data`.
* `nodemailer` 8 → 10.
* `firebase-admin` 13 → 14, with the code migrated to the modular API.
* `uuid` removed in favour of `crypto.randomUUID`.
* `node-telegram-bot-api` **kept at 0.67**: 2.x is a full API rewrite and the bot can't be tested end to end here. npm `overrides` replace its vulnerable `request` with the maintained `@cypress/request` and pin patched `qs` and `uuid`. The API surface the bot uses was checked.
* New: `@aws-sdk/lib-storage`; `supertest` (dev).

**Web changes:** TanStack Start/Router to latest, Vite 7 → 8, `@lovable.dev/vite-tanstack-config` 2.27, `nitro` peer bump, `zod` 4. The production build was verified.

---

## 8. Remaining risks and unresolved items

**Security**
1. **Views can still be farmed at scale.** Tickets, deduplication and caps stop the trivial attacks, but an attacker with many accounts and IPs (botnets, residential proxies) can still farm views. Next steps: device attestation (Play Integrity), CAPTCHA on registration, and anomaly review of `view_events`.
2. **Client keys are public by design.** They identify clients; they don't authenticate them.
3. **Credentials live in the database in plain text** (`app_settings`: SMTP and storage keys). Move them to environment variables or a secret manager, or encrypt them at rest.
4. **Credentials must be rotated.** The SMTP password, B2 keys and JWT secrets were readable through F2/F3 on any instance that was ever reachable. The old API keys remain in git history (history was not rewritten).
5. **Session model.** Access tokens live for 7 days in `localStorage`, with no revocation list. Admin and user tokens share a signing secret (they're separated by table lookups), and admins have no MFA. Recommended: 15-minute access tokens, httpOnly cookies, an admin audience claim or separate secret, and MFA.
6. **Rate limits are per process** (memory store). Running several API instances needs a shared store such as Redis.
7. **Legacy database rows** with unsafe `stored_name` values are neutralised at read time but not removed (query in §9). Copies made before migration 003 still pay the copier.
8. **Uploads:** any file type up to 10 GB, no malware scanning, no per-user storage quota (only rate limits).
9. **Personal data:** `view_events` and `view_logs` store IP addresses; define a retention period.
10. bcrypt truncates passwords longer than 72 bytes (low risk).

**Not verified against real services**
* S3/R2/B2 and Bunny (mock-tested only)
* Telegram bot
* FCM delivery
* SMTP
* Release APK on a device
* Signed or notarized desktop builds (installers are currently unsigned; the macOS install page tells users to bypass Gatekeeper)

**Quality gaps**
* Coverage gaps listed in §6.2.
* Five TypeScript errors that predate this work.
* No web unit tests; lint isn't in CI.
* The orphaned `/share/$fileId` page calls an endpoint that doesn't exist.
* Earnings "today" and "this week" are still placeholders.
* The contact form is rate-limited but has no CAPTCHA.

---

## 9. Production deployment checklist

**Before deploying**
- [ ] Back up the production database. Run `npm run db:migrate:status`, then `npm run db:migrate`:
  - 003 backfills `files.legacy_views` and adds `legacy_earning_rate`
  - 004 invalidates outstanding reset codes
  - 001 is a no-op on an existing schema
- [ ] Rotate the SMTP password and every storage credential. Generate new `JWT_SECRET` and `JWT_REFRESH_SECRET` (`openssl rand -hex 48`, different from each other). Issue new web and mobile client keys.
- [ ] Set production environment variables (see `backend/.env.example`):
  - `NODE_ENV=production`
  - `https://` URLs for `BASE_URL` and `FRONTEND_URL`
  - `FRONTEND_ORIGINS`
  - `TRUST_PROXY` matching the proxy setup (e.g. `1`)
  - `UPLOADS_DIR`
  - `FIREBASE_SERVICE_ACCOUNT_PATH`

  The server refuses to start in production with weak or placeholder secrets or `http` URLs.
- [ ] Put TLS in front of the API. The proxy must overwrite `X-Forwarded-For` rather than append to whatever the client sent.
- [ ] Install `ffmpeg` on the API host (thumbnails).
- [ ] Find legacy unsafe rows:
  ```sql
  SELECT id FROM files WHERE stored_name LIKE '%/%' OR stored_name LIKE '%\\%' OR stored_name LIKE '.%';
  ```

**Clients**
- [ ] **Release the new Android build** (view tickets). Configure `VIDORA_API_KEY`, `VIDORA_API_BASE_URL`, `VIDORA_WEB_BASE_URL`, `VIDORA_ADMOB_APP_ID`, and the CI secret `GOOGLE_SERVICES_JSON` (base64).
- [ ] Web: set `VITE_API_URL`, `VITE_API_KEY`, `VITE_DESKTOP_VERSION`. If the GitHub repository is private, set `VITE_DESKTOP_DOWNLOAD_BASE`, because release assets won't be downloadable.
- [ ] Desktop: build with `VIDORA_TRUSTED_HOSTS` if the dashboard isn't on `vidora.app`. Remote Config `desktop_url` must be `https://`. Sign and notarize the installers.
- [ ] Configure AdMob unit IDs in the admin panel (release builds have no fallback units).

**After deploying**
- [ ] Rotate admin passwords (minimum 10 characters) and plan MFA.
- [ ] Watch `admin_audit_log` and `view_events` (rejection reasons).
- [ ] With more than one API instance, configure a shared rate-limit store.
- [ ] Commission an independent penetration test before public launch.

---

## 10. Commits

| Commit | Content |
|---|---|
| `552f648` | P0 fixes F1–F5 (plus F9, F11, Range, stream route), test harness |
| `9fe5a19` | P1: payouts, purge, copy, brute force, earnings ledger, dependency upgrades |
| `1c0aed2` | P2: reset codes, image uploads, N2/N4, Android hardening, AdMob |
| `5f1135e` | P3: cleanup job, audit log, N1, Bunny tests, repo hygiene |
| `e60325c` | Authorization suite; N6 refresh-token fix; coverage script |
| `1171f5b` | CI pipelines |
| `ae45b6a` | Log redaction (N9) |
| *(this file)* | Report |

# Vidora Android physical-device QA checklist

Status: **partial physical-device run, 2026-11-19**. Mi 11X (M2012K11AI), Android 13, 1080×2400 at 440 dpi, Wi-Fi. Debug APK used isolated `vidora_deviceqa_20261119_test` MySQL backend on port 5002. Do not mark a row passed until it is observed on a device. Use an isolated backend and test accounts for financial, upload, and paid-view checks. Record device model, Android version, build hash, screen size, network, time, result, and screenshot or log reference for each failure.

## Screen sweep

For **every** Activity below, check initial render, scroll reachability, text clipping, 48dp touch targets, dark theme, keyboard/insets where relevant, loading/empty/error states, tap actions, and system Back. Repeat on a small phone and a large phone/tablet; rotate the player where supported.

| # | Activity | Specific checks | Result |
| --- | --- | --- | --- |
| 1 | Splash | Startup route with and without session; no blank screen | Observed: launch and session restoration |
| 2 | Home | Guest discovery, trending data, bottom navigation, offline/retry | Observed: guest and authenticated trending; local API fix verified |
| 3 | Login | Valid/invalid credentials, keyboard, errors, return path | Observed: viewer/owner login and logout |
| 4 | Signup | Validation, account creation, referral link | Not run |
| 5 | ForgotPassword | Approved reset page, rejected settings URL, external link | Not run |
| 6 | FileDetail | Deep link, metadata, revoked/expired link, retry | Observed: synthetic shared video details |
| 7 | Player | Play/pause, seek, Range, buffering, retry, rotate | Observed: guest/viewer/owner playback; paid-view DB checks |
| 8 | PasteLink | Valid/invalid share link, history | Not run |
| 9 | Search | Guest query, results, empty/error state | Observed: guest search HTTP 200 |
| 10 | Feed | Subscription feed, pagination, empty state | Observed: empty feed |
| 11 | SubscriptionsList | Creator open, bell toggle, unsubscribe | Not run |
| 12 | CreatorProfile | Profile content, files, subscribe/unsubscribe | Not run |
| 13 | Upload | Progress, cancel, retry, large file, share URL | Partial: upload and delete observed; cancellation/retry pending |
| 14 | CreatorHub | Navigation to files and earnings | Observed: creator navigation and summary |
| 15 | MyVideos | List, paginate, share, delete confirmation | Observed: list, delete; stale-list fix built, return-after-upload retest pending |
| 16 | Earnings | Real summary/history, referrals, payout validation | Observed: isolated earnings; referral count displays 0.0 |
| 17 | Saved | Save/remove, open after restart, empty state | Observed: empty state fix on device |
| 18 | Profile | Guest/logged-in state, settings, logout | Observed: guest, logged-in, logout, restoration |
| 19 | Privacy | Approved URL, blocked URL, external browser link | Observed: policy page rendered with current debug web host |
| 20 | Terms | Approved URL, blocked URL, external browser link | Not run |
| 21 | Help | Approved URL, blocked URL, external browser link | Observed: help and FAQ rendered |
| 22 | About | Content, links, Back | Observed: about content rendered |
| 23 | Contact | Contact actions, malformed destination | Not run |
| 24 | ImageViewer | Load, zoom, network failure, Back | Not run |
| 25 | Notifications | Permission, list, tap destination, empty state | Not run |
| 26 | Downloads | Download, open offline, remove, missing file | Observed: empty downloads; offline playback pending |
| 27 | Subscription | Play prices, purchase/cancel/error, restore | Not run |


## Observed device evidence (2026-11-19)

- Isolated paid-view DB: one counted `ok` event for an eligible viewer; repeated playback produced an uncounted `duplicate`; owner playback produced an uncounted `self_view`. Anonymous playback produced no ticket/event. Media delivery is server evidence, not proof of human attention.
- Logout returned to guest profile. Owner and viewer sessions survived force-stop/relaunch. Encrypted storage corruption, access-token expiry, refresh rotation, and old-session rejection were not exercised on device.
- A phone photo was selected during file-picker testing, uploaded only to the isolated backend, and deleted through the app. The backend retains a soft-deleted test row until isolated QA database cleanup. The original phone photo was untouched. Synthetic seeded video remained active for playback tests.
- Debug Remote Config previously overrode the selected LAN API with a cached stale host; fixed by honoring the build's debug base URL. The privacy page required a current debug web host build property; no production policy URL was changed.
- Device has a custom cursive system font. Small/large screen, accessibility, FCM receipt, Play Billing purchase, network interruption, upload cancellation/retry, and all unobserved Activity rows remain pending.
- Transient screenshots: `/tmp/vidora-isolated-home.png`, `/tmp/vidora-guest-player.png`, `/tmp/vidora-profile-restored3.png`, `/tmp/vidora-privacy-fixed.png`, `/tmp/vidora-saved.png`.

## End-to-end scenarios

- [ ] Guest: browse, search, open valid and expired shared links, play video and view image; no paid-view reward.
- [ ] Auth: register/login, force access expiry, refresh once, restart app, confirm Keystore-backed session restoration, logout, confirm old session is rejected; repeat with corrupted/unavailable encrypted storage.
- [ ] Media: play/pause, seek forward/back, HTTP Range, loss and restoration of network, retry, expired media URL, revoked share, downloaded/offline playback.
- [ ] Paid views on isolated backend: authenticated eligible viewer creates ticket, media is delivered, redeem once; duplicate, anonymous, owner, and replay attempts earn nothing. Delivery alone is not proof of human attention.
- [ ] Creator: small and large uploads, progress, cancel before completion, retry after interruption, share-link generation, file listing/share/delete.
- [ ] Notifications: permission grant/deny, FCM receipt when configured, tap destination, no token in logs.
- [ ] Billing: localized Play prices, purchase cancellation, successful test purchase and restore, server premium sync. Use Play test products/accounts only.
- [ ] Money: earnings and referral figures match isolated backend; payout method add and validation; no fabricated figures.
- [ ] Screen sizes/accessibility: small and large displays, font scaling, TalkBack traversal/labels, contrast, touch targets, dialogs, keyboard and system bars.

## Release gates after device QA

- Host rerun after device fixes: `:app:assembleDebug :app:testDebugUnitTest` passed (13 tests, 0 failures). `:app:lintDebug :app:lintRelease :app:assembleRelease :app:bundleRelease` passed, including R8 (2026-11-19). Lint reports: debug 0 errors/599 warnings; release 0 errors/597 warnings. Reports: `app/build/reports/lint-results-{debug,release}.html`.
- Artifacts: `app/build/outputs/apk/release/app-release-unsigned.apk` (6,196,467 bytes) and `app/build/outputs/bundle/release/app-release.aab` (10,238,574 bytes). APK verification says `DOES NOT VERIFY` because it is unsigned; AAB `jarsigner` reports unsigned. Release signing credentials are not available.
- Attach screenshot or screen recording for each distinct defect and record reproduction steps.
- Fix only reproduced defects, then rerun JVM tests, debug/release lint, and minified release build.
- Obtain authorized release signing configuration securely; verify signed APK/AAB without exposing secrets.
- Review Git diff and remote again. Push only after explicit approval.

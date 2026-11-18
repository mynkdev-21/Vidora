# Vidora Android physical-device QA checklist

Status: **not run**. No physical Android device was visible in the host USB inventory on 2026-11-19. Do not mark a row passed until it is observed on a device. Use an isolated backend and test accounts for financial, upload, and paid-view checks. Record device model, Android version, build hash, screen size, network, time, result, and screenshot or log reference for each failure.

## Screen sweep

For **every** Activity below, check initial render, scroll reachability, text clipping, 48dp touch targets, dark theme, keyboard/insets where relevant, loading/empty/error states, tap actions, and system Back. Repeat on a small phone and a large phone/tablet; rotate the player where supported.

| # | Activity | Specific checks | Result |
| --- | --- | --- | --- |
| 1 | Splash | Startup route with and without session; no blank screen | Not run |
| 2 | Home | Guest discovery, trending data, bottom navigation, offline/retry | Not run |
| 3 | Login | Valid/invalid credentials, keyboard, errors, return path | Not run |
| 4 | Signup | Validation, account creation, referral link | Not run |
| 5 | ForgotPassword | Approved reset page, rejected settings URL, external link | Not run |
| 6 | FileDetail | Deep link, metadata, revoked/expired link, retry | Not run |
| 7 | Player | Play/pause, seek, Range, buffering, retry, rotate | Not run |
| 8 | PasteLink | Valid/invalid share link, history | Not run |
| 9 | Search | Guest query, results, empty/error state | Not run |
| 10 | Feed | Subscription feed, pagination, empty state | Not run |
| 11 | SubscriptionsList | Creator open, bell toggle, unsubscribe | Not run |
| 12 | CreatorProfile | Profile content, files, subscribe/unsubscribe | Not run |
| 13 | Upload | Progress, cancel, retry, large file, share URL | Not run |
| 14 | CreatorHub | Navigation to files and earnings | Not run |
| 15 | MyVideos | List, paginate, share, delete confirmation | Not run |
| 16 | Earnings | Real summary/history, referrals, payout validation | Not run |
| 17 | Saved | Save/remove, open after restart, empty state | Not run |
| 18 | Profile | Guest/logged-in state, settings, logout | Not run |
| 19 | Privacy | Approved URL, blocked URL, external browser link | Not run |
| 20 | Terms | Approved URL, blocked URL, external browser link | Not run |
| 21 | Help | Approved URL, blocked URL, external browser link | Not run |
| 22 | About | Content, links, Back | Not run |
| 23 | Contact | Contact actions, malformed destination | Not run |
| 24 | ImageViewer | Load, zoom, network failure, Back | Not run |
| 25 | Notifications | Permission, list, tap destination, empty state | Not run |
| 26 | Downloads | Download, open offline, remove, missing file | Not run |
| 27 | Subscription | Play prices, purchase/cancel/error, restore | Not run |

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

- Attach screenshot or screen recording for each distinct defect and record reproduction steps.
- Fix only reproduced defects, then rerun JVM tests, debug/release lint, and minified release build.
- Obtain authorized release signing configuration securely; verify signed APK/AAB without exposing secrets.
- Review Git diff and remote again. Push only after explicit approval.

# Vidora — Project Progress

> **Vidora** — File hosting & monetization platform. Creators upload, share links, earn from views. Consumers watch via Android app.


## ✅ Backend (Node.js + Express + MySQL)

- [x] REST API (Express, port 5001), MySQL `videora` — 18 tables
- [x] JWT auth (access + refresh rotation), API key middleware
- [x] Firebase Admin SDK (FCM push), Nodemailer (SMTP emails)
- [x] Register, Login, Forgot Password (OTP), Reset Password
- [x] Email verification (link-based, 24hr, 10min resend cooldown)
- [x] Banned user detection, Referral system (`?ref=`)
- [x] File upload (multer), auto thumbnail (ffmpeg), share tokens
- [x] Video streaming with range support (local + cloud), API key required
- [x] **Copy Files (Vidora to Vidora)** — reference copy, no storage duplication, auto share token
- [x] Dynamic earning rate, min payout, referral bonus (from DB)
- [x] Referral bonus on completed withdrawal only
- [x] In-app notifications (auto + manual + broadcast)
- [x] FCM push notifications (file promotion with thumbnail)
- [x] Email: Verify, Password Reset, Payout Completed/Failed, Ticket Reply
- [x] SMTP configurable from admin panel
- [x] Contact messages, Ticket system, Report content
- [x] Public settings API, FCM token registration
- [x] Admin auth (separate table + JWT), admin profile update
- [x] **Storage Adapter** — supports Local, Cloudflare R2, Backblaze B2, BunnyCDN, Custom S3
- [x] **Earnings preserved on delete** — soft delete keeps views, purge saves to earnings table + purged_views
- [x] **View count anti-fraud** — same IP + same file = max 1 view per hour (view_logs table)
- [x] **Subscription system** — subscribe/unsubscribe, bell toggle, feed, creator profile
- [x] **Subscriber notifications** — FCM push when creator uploads new file
- [x] **Search API** — search files by name/creator, filter by type
- [x] **Cache-Control headers** — trending (2min), feed (1min), settings (5min)
- [x] **Avatar upload** — `/api/users/avatar`, served at `/avatars/`
- [x] **Admin system-info API** — env-based config exposed to admin panel
- [x] **Purge deleted files** — permanently delete from DB + storage, preserve earnings + views
- [x] **Open URL endpoint** — `/api/open-url` for desktop app external links
- [x] **All hardcoded IPs removed** — uses .env (BASE_URL, FRONTEND_URL) everywhere

---

## ✅ Frontend — Creator Dashboard

### Pages
| Route | Description |
|---|---|
| `/` | Landing (hero, 3D tool images, comparison, FAQ, **desktop download section**) |
| `/login` | Login (banned detection, forgot password) |
| `/signup` | Signup (referral code) |
| `/forgot-password` | OTP reset flow |
| `/verify-email` | Email verification |
| `/mac-install` | **Mac installation instructions (Gatekeeper fix)** |
| `/dashboard` | Overview (real data, dynamic min payout) |
| `/dashboard/files` | File management |
| `/dashboard/upload` | Upload + **Copy Files (Vidora to Vidora)** |
| `/dashboard/earnings` | Earnings summary |
| `/dashboard/withdraw` | Withdraw (receipts, reasons, **coming soon badges**) |
| `/dashboard/referrals` | Referrals (dynamic %, **dynamic referral link**) |
| `/dashboard/support` | Tickets + Message Us |
| `/dashboard/settings-page` | Payment methods |
| `/dashboard/settings` | Profile (**avatar upload**, name, password) |
| `/dashboard/api-key` | Telegram bot instructions |
| `/v/:token` | Share page (report button) |
| `/report` | Report content |
| `/contact` | Banned user contact |
| `/help` | Help (Message Us modal) |
| `/privacy`, `/terms`, `/rates`, `/download`, `/payouts` | Info pages |

### Key Features
- [x] Notification bell (unread count, auto-refresh)
- [x] Email verification banner (resend, tick, cooldown)
- [x] "Follow Us" Telegram card in sidebar (API-driven)
- [x] Landing: 3D images (dashboard/app/telegram)
- [x] Copy Files section (paste Vidora URL → copy to account → get share link)
- [x] All links dynamic from admin API
- [x] **Avatar upload** — click profile picture, select image, auto-upload
- [x] **Navbar avatar** — shows uploaded profile picture or initials fallback
- [x] **Withdraw "Coming Soon"** — unavailable methods show yellow "Soon" badge
- [x] **Desktop download section** — Windows (.exe) + Mac (instruction page)
- [x] **External link handler** — opens in system browser (for desktop app)
- [x] **No hardcoded URLs** — all from VITE_API_URL env

---

## ✅ Admin Panel

### Pages
| Route | Description |
|---|---|
| `/main/admin` | Login (hidden) |
| `/admin` | Overview stats |
| `/admin/users` | Users + **avatars** + view detail |
| `/admin/user/:id` | Full user data + notify + ban |
| `/admin/files` | Files + push notify bell + **Purge Deleted** button |
| `/admin/payouts` | Payouts (receipt, reason, locked) |
| `/admin/subscriptions` | Premium users management |
| `/admin/tickets` | Ticket conversations |
| `/admin/messages` | Contact inbox |
| `/admin/analytics` | Growth charts |
| `/admin/storage` | **Cloud Storage config (B2/R2/Bunny/S3)** |
| `/admin/settings` | Links, Rates, Ads, SMTP, Channel URL |
| `/admin/profile` | Admin email + password change |

### Key Features
- [x] Separate auth, dedicated profile page
- [x] Push notification per file (FCM)
- [x] Broadcast to all users (portal-based modal, centered)
- [x] Grant/remove premium
- [x] SMTP configuration
- [x] Ads ON/OFF + dynamic AdMob IDs
- [x] Dynamic rates + Telegram channel URL
- [x] **Storage page** — switch providers, test connection, one-click activate
- [x] **System info cards** — dynamic from env
- [x] **User avatars** in users list
- [x] **Purge deleted files** — permanently delete + clear storage + preserve earnings
- [x] **Login as User (Impersonate)** — admin generates temp token, opens user dashboard in new tab

---

## ✅ Android App (Java + Firebase)

### Screens
- [x] Splash (Remote Config), Home (trending, offline banner, bell)
- [x] File Detail → Player / Image Viewer
- [x] **Feed** — subscribed creators' latest uploads (YouTube-style, creator circles + cards + ads)
- [x] **Creator Profile** — avatar, stats, subscribe, Latest/Popular sort, file list with ads
- [x] **All Subscriptions** — list with bell toggle (shake animation), unsubscribe
- [x] Downloads (local playback, delete)
- [x] Notifications, Subscription (₹199/mo, ₹499/3mo, ₹1499/yr)
- [x] Login, Signup, Forgot Password (WebView)
- [x] Profile (avatar image, verify banner, premium card, downloads, about, **notification toggle**)
- [x] About, Contact Support, Privacy, Help

### Key Features
- [x] Firebase Remote Config (dynamic base URL)
- [x] FCM push (BigPicture, click → file detail)
- [x] Crashlytics, Google Play Billing
- [x] Premium sync from server, congratulation dialog
- [x] Dynamic ads ON/OFF, rewarded ad on unlock + download
- [x] **Ads in feed/creator profile** — banner ad every 3 items
- [x] File download + offline playback
- [x] Email verification banner in Profile
- [x] Ad blocker detection (skipped offline)
- [x] **Subscribe system** — subscribe button on player screen, creator profile
- [x] **Creator avatar** on player screen + profile
- [x] **Subscriber FCM notifications** — auto push when creator uploads
- [x] **Notification ON/OFF toggle** — Firebase token delete/restore
- [x] **OkHttp 10MB disk cache** — respects Cache-Control headers
- [x] **No-animation navigation** — seamless bottom bar switching
- [x] **Views on player screen** — shows view count below title
- [x] **Image placeholder** — purple icon when no thumbnail
- [x] **Earnings K/M format** — $1.5K, $2.3M on profile
- [x] **Player duration fix** — handles TIME_UNSET gracefully
- [x] **Self-subscribe blocked** — own videos don't show subscribe
- [x] **Upload from app** — `+` button opens upload screen, file picker, progress bar, share URL returned, copy link, visit dashboard card

---

## ✅ Desktop App (Tauri — Windows + Mac)

- [x] **Tauri v2** — lightweight WebView wrapper (~5MB)
- [x] **Firebase Remote Config** — dynamic URL (change without app update)
- [x] **Auto-build via GitHub Actions** — push tag → .exe + .dmg generated
- [x] **Windows installer** — `Vidora_1.0.0_x64-setup.exe` (2.3 MB)
- [x] **Mac DMG** — Apple Silicon + Intel variants
- [x] **External links** → open in system browser via backend `/api/open-url`
- [x] **Custom app icon** with proper padding
- [x] **Landing page download section** — direct download from own server
- [x] **Mac install instructions page** — Gatekeeper fix guide
- [x] GitHub repo: `mynkdev-21/vidora-desktop`

---

## ✅ Telegram Bot

- [x] `/start` — Link account via API key
- [x] `/status` — Check connection
- [x] `/help` — Show commands
- [x] `/copy <link>` — **Copy Vidora file to account + return share URL**
- [x] Send file/video/photo → Upload to Vidora + return share URL
- [x] Auto share token generation on upload
- [x] Thumbnail generation for videos
- [x] File size limit (50MB Telegram API)
- [x] Markdown-safe file names
- [x] **Subscriber notifications on bot upload** — FCM push to subscribers

---

## ✅ Email System

| Event | Email |
|---|---|
| Signup | Verify Email (link, 24hr) |
| Forgot Password | 6-digit OTP |
| Payout Completed | Amount + method |
| Payout Failed | Amount + reason |
| Ticket Reply | Admin reply text |

---

## ✅ Cloud Storage System

- [x] **Storage Adapter Pattern** — pluggable providers
- [x] Supported: Local, Cloudflare R2, Backblaze B2, BunnyCDN, Custom S3
- [x] Admin UI: select provider, enter credentials, test connection, activate
- [x] One active provider at a time, old files stay accessible (backward compat)
- [x] Upload + Stream + Delete all go through adapter
- [x] Video streaming with range support works on all providers
- [x] **Delete from both local + cloud** simultaneously
- [x] Settings cached (60s) to avoid DB hit per request
- [x] **Currently active: Backblaze B2** (tested, working)

---

## ✅ Subscription / Creator Channel System

- [x] `subscriptions` table (subscriber_id, creator_id, notify flag)
- [x] Subscribe/Unsubscribe from player screen
- [x] Bell toggle (ON/OFF notifications per creator, shake animation)
- [x] Feed page — subscribed creators' latest files (paginated, YouTube-style)
- [x] Creator circles at top of feed (horizontal scroll, clickable)
- [x] Creator Profile page (avatar, stats, subscribe, Latest/Popular sort)
- [x] All Subscriptions list (bell toggle, unsubscribe)
- [x] Auto FCM push when creator uploads (only to notify=1 subscribers)
- [x] In-app notification created for subscribers
- [x] Self-subscribe blocked (own videos don't show subscribe button)
- [x] Access from: Player screen, Feed circles, Feed items, All Subscriptions

---

## ✅ Bug Fixes (This Session)

- [x] Broadcast modal inside navbar → React Portal fix
- [x] Earnings reducing on file delete → fixed (ALL files + purged_views)
- [x] Admin settings system info hardcoded → dynamic from env
- [x] View count not working → fixed play endpoint (local first, cloud fallback)
- [x] Share page showing 0 views → reads from files.view_count
- [x] View fraud prevention → IP dedup (1 view/hour/file/IP)
- [x] Player duration garbage values → handles TIME_UNSET
- [x] Double slash in avatar URLs → strip leading slash
- [x] ClassCastException in creator profile → safe toInt/toLong helpers
- [x] Feed directly opening player → goes through FileDetailActivity
- [x] B2 cloud delete not working → deletes both local + cloud
- [x] FCM register empty token → allows null to disable
- [x] GitHub Actions permissions → added `contents: write`
- [x] All hardcoded IPs removed from backend + frontend
- [x] **AdMob IDs fully dynamic** — all ad unit IDs from admin API, no test ID fallbacks, no crash on empty ID

---

## 🔲 Pending

- [ ] Cloudflare CDN setup (when domain ready)
- [ ] Video quality selector
- [ ] Production deployment (domain, SSL, real AdMob IDs)
- [ ] Play Store listing + Billing products setup
- [ ] Apple Developer account ($99/yr) for signed Mac app

---

## 📈 Scaling Roadmap (Future)

| Users | Add | Cost |
|-------|-----|------|
| 1K (now) | Nothing — current is fine | ₹0 |
| 5K | Redis cache (trending, profiles) | €5/mo |
| 20K | PM2 cluster + MySQL indexes | €0 |
| 50K | MySQL Read Replica + Cloudflare CDN | €20/mo |
| 1L | Full stack (LB + 3 Node instances + Redis Cluster) | €60/mo |

**Full 1L Users Architecture:**
```
Cloudflare CDN → Load Balancer → Node × 3 → Redis + MySQL Primary + Replicas → B2 Storage
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TanStack Router, Tailwind CSS 4, Recharts |
| Backend | Node.js 24, Express 4, MySQL 9, Firebase Admin, Nodemailer |
| Android | Java, ExoPlayer, Retrofit, Glide, AdMob, Firebase, Play Billing |
| Desktop | Tauri v2 (Rust), Firebase Remote Config, GitHub Actions CI/CD |
| Telegram | node-telegram-bot-api, file upload + copy |
| Storage | Backblaze B2 (active), supports R2/Bunny/S3/Local |
| Database | MySQL `videora` — 18 tables |
| CI/CD | GitHub Actions (auto-build Windows + Mac) |

---

*Last updated: June 2, 2026*

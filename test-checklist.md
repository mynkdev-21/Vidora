# Vidora — Pre-Launch Test Checklist

> Manually test each item. Mark ✅ when passed, ❌ if failed.

---

## 1. Auth (Web + App) — /20

| # | Test | Web | App | Status |
|---|------|-----|-----|--------|
| 1 | Signup with new email | | | ☐ |
| 2 | Signup with referral code (`?ref=userId`) | | | ☐ |
| 3 | Login with correct credentials | | | ☐ |
| 4 | Login with wrong password → error message | | | ☐ |
| 5 | Login with banned account → banned message | | | ☐ |
| 6 | Forgot password → OTP email received | | | ☐ |
| 7 | Reset password with OTP → success | | | ☐ |
| 8 | Email verification link sent on signup | | | ☐ |
| 9 | Verify email link → account verified | | | ☐ |
| 10 | Verification banner disappears after verify | | | ☐ |
| 11 | Resend verification (10 min cooldown) | | | ☐ |
| 12 | Logout works | | | ☐ |
| 13 | Session persists on app restart | | | ☐ |
| 14 | Token refresh works (auto re-login) | | | ☐ |

---

## 2. File Upload — /15

| # | Test | Web | App | Bot | Status |
|---|------|-----|-----|-----|--------|
| 15 | Upload video from dashboard | | | | ☐ |
| 16 | Upload image from dashboard | | | | ☐ |
| 17 | Upload via Telegram bot (send file) | | | | ☐ |
| 18 | Upload via app (+) button | | | | ☐ |
| 19 | Thumbnail auto-generated for video | | | | ☐ |
| 20 | Upload progress shows correctly | | | | ☐ |
| 21 | Share URL returned after upload | | | | ☐ |
| 22 | File appears in "My Files" list | | | | ☐ |
| 23 | Copy file from Vidora URL (dashboard) | | | | ☐ |
| 24 | Copy file via Telegram `/copy` command | | | | ☐ |
| 25 | Upload to B2 cloud storage | | | | ☐ |
| 26 | Large file upload (100MB+) | | | | ☐ |

---

## 3. Video Playback & Streaming — /10

| # | Test | Status |
|---|------|--------|
| 27 | Video plays in app (ExoPlayer) | ☐ |
| 28 | Video range support (seek works) | ☐ |
| 29 | Image opens in image viewer | ☐ |
| 30 | Player custom controls (play/pause/seek/fullscreen) | ☐ |
| 31 | Duration shows correctly (not garbage) | ☐ |
| 32 | Video plays from B2 cloud storage | ☐ |
| 33 | Offline video playback (downloaded) | ☐ |
| 34 | Video plays on share page (web) | ☐ |

---

## 4. View Count — /8

| # | Test | Status |
|---|------|--------|
| 35 | View count increments after 3 sec play | ☐ |
| 36 | Same IP, same file → only 1 view per hour | ☐ |
| 37 | View count shows on share page | ☐ |
| 38 | View count shows on player screen | ☐ |
| 39 | Views persist after file soft-delete | ☐ |
| 40 | Views persist after file purge (purged_views) | ☐ |
| 41 | Dashboard "Total Views" correct | ☐ |
| 42 | Earnings calculated correctly from views | ☐ |

---

## 5. Earnings & Payouts — /12

| # | Test | Status |
|---|------|--------|
| 43 | Earnings summary shows correct total | ☐ |
| 44 | Dynamic earning rate from admin | ☐ |
| 45 | Dynamic min payout from admin | ☐ |
| 46 | Request payout → success | ☐ |
| 47 | Payout below minimum → error | ☐ |
| 48 | Payout history shows in dashboard | ☐ |
| 49 | Admin marks payout completed → email sent | ☐ |
| 50 | Admin marks payout failed → email + reason | ☐ |
| 51 | Referral bonus on completed payout | ☐ |
| 52 | Earnings don't decrease on file delete | ☐ |
| 53 | Withdraw "Coming Soon" badges show | ☐ |
| 54 | Payment methods save correctly | ☐ |

---

## 6. Subscription System — /14

| # | Test | Status |
|---|------|--------|
| 55 | Subscribe to creator from player screen | ☐ |
| 56 | Unsubscribe works | ☐ |
| 57 | Own videos don't show subscribe button | ☐ |
| 58 | Feed shows subscribed creators' files | ☐ |
| 59 | Feed empty state when no subscriptions | ☐ |
| 60 | Creator circles at top of feed (clickable) | ☐ |
| 61 | All Subscriptions list shows | ☐ |
| 62 | Bell toggle works (shake animation) | ☐ |
| 63 | Creator Profile page loads | ☐ |
| 64 | Creator Profile — Latest/Popular sort | ☐ |
| 65 | Subscriber count on dashboard | ☐ |
| 66 | FCM notification on creator upload (bell ON) | ☐ |
| 67 | No notification when bell OFF | ☐ |
| 68 | Notification click → opens file detail | ☐ |

---

## 7. Notifications — /10

| # | Test | Status |
|---|------|--------|
| 69 | FCM push notification received | ☐ |
| 70 | Push with thumbnail (BigPicture) | ☐ |
| 71 | Admin broadcast → all users get notification | ☐ |
| 72 | Admin notify single user | ☐ |
| 73 | Bell icon (web) shows unread count | ☐ |
| 74 | Mark all read works | ☐ |
| 75 | Notification toggle ON/OFF (app profile) | ☐ |
| 76 | In-app notification list loads | ☐ |
| 77 | Admin file bell → push to all | ☐ |
| 78 | Duplicate notifications not sent | ☐ |

---

## 8. Ads — /8

| # | Test | Status |
|---|------|--------|
| 79 | Banner ads show (player, file detail) | ☐ |
| 80 | Feed ads every 3 items | ☐ |
| 81 | Rewarded ad on download button | ☐ |
| 82 | Ads hidden when disabled (admin toggle) | ☐ |
| 83 | Premium users see no ads | ☐ |
| 84 | Ad IDs from admin (not hardcoded) | ☐ |
| 85 | No crash when ad ID empty | ☐ |
| 86 | Ad blocker detection (offline skip) | ☐ |

---

## 9. Downloads — /6

| # | Test | Status |
|---|------|--------|
| 87 | Download file from player | ☐ |
| 88 | Download saved to Downloads/Vidora | ☐ |
| 89 | Downloaded file plays locally | ☐ |
| 90 | Delete downloaded file | ☐ |
| 91 | Downloads screen shows history | ☐ |
| 92 | Offline mode → "View Downloads" button | ☐ |

---

## 10. Admin Panel — /16

| # | Test | Status |
|---|------|--------|
| 93 | Admin login works (`/main/admin`) | ☐ |
| 94 | Overview stats load | ☐ |
| 95 | Users list with avatars | ☐ |
| 96 | User detail page | ☐ |
| 97 | Ban/Unban user | ☐ |
| 98 | Login as User (impersonate) | ☐ |
| 99 | Files list + purge deleted | ☐ |
| 100 | Payouts — receipt upload, reason, status | ☐ |
| 101 | Settings save (links, rates, ads, SMTP) | ☐ |
| 102 | Storage config — test connection | ☐ |
| 103 | Broadcast notification modal | ☐ |
| 104 | Grant/remove premium | ☐ |
| 105 | Tickets — reply works | ☐ |
| 106 | Analytics page loads | ☐ |
| 107 | Admin profile update | ☐ |
| 108 | app-ads.txt served from settings | ☐ |

---

## 11. Desktop App — /6

| # | Test | Status |
|---|------|--------|
| 109 | Mac app opens correctly | ☐ |
| 110 | Firebase Remote Config URL loads | ☐ |
| 111 | External links open in browser | ☐ |
| 112 | Windows exe installs and runs | ☐ |
| 113 | Login works in desktop app | ☐ |
| 114 | Dashboard functional in desktop app | ☐ |

---

## 12. Telegram Bot — /6

| # | Test | Status |
|---|------|--------|
| 115 | `/start` → link account | ☐ |
| 116 | `/status` → shows connection | ☐ |
| 117 | Send video → upload + share URL | ☐ |
| 118 | `/copy <link>` → copy file + share URL | ☐ |
| 119 | Thumbnail generated for bot uploads | ☐ |
| 120 | Subscriber notification on bot upload | ☐ |

---

## 13. Profile & Settings — /8

| # | Test | Status |
|---|------|--------|
| 121 | Avatar upload (web) | ☐ |
| 122 | Avatar shows in navbar (web) | ☐ |
| 123 | Avatar shows in app profile | ☐ |
| 124 | Avatar shows in player creator section | ☐ |
| 125 | Change password works | ☐ |
| 126 | Premium card shows for premium users | ☐ |
| 127 | Subscription plans load (app) | ☐ |
| 128 | Referral link copies correctly | ☐ |

---

## 14. Landing Page & Public — /6

| # | Test | Status |
|---|------|--------|
| 129 | Landing page loads fully | ☐ |
| 130 | Download buttons work (Windows, Mac) | ☐ |
| 131 | Mac install instructions page | ☐ |
| 132 | Share page (`/v/:token`) shows file info | ☐ |
| 133 | Report content works | ☐ |
| 134 | Contact form works | ☐ |

---

## 15. Storage & Performance — /6

| # | Test | Status |
|---|------|--------|
| 135 | B2 upload works | ☐ |
| 136 | B2 streaming works | ☐ |
| 137 | B2 delete works (purge) | ☐ |
| 138 | OkHttp cache working (less API calls) | ☐ |
| 139 | Cache-Control headers on API | ☐ |
| 140 | App opens fast (< 3 sec) | ☐ |

---

## Score

| Section | Total | Passed |
|---------|-------|--------|
| Auth | 14 | /14 |
| Upload | 12 | /12 |
| Playback | 8 | /8 |
| Views | 8 | /8 |
| Earnings | 12 | /12 |
| Subscriptions | 14 | /14 |
| Notifications | 10 | /10 |
| Ads | 8 | /8 |
| Downloads | 6 | /6 |
| Admin | 16 | /16 |
| Desktop | 6 | /6 |
| Telegram | 6 | /6 |
| Profile | 8 | /8 |
| Landing | 6 | /6 |
| Storage | 6 | /6 |
| **TOTAL** | **140** | **/140** |

---

## Notes

- Test with 2 different accounts (creator + consumer)
- Test on real device (not emulator) for ads
- Test offline mode (airplane mode)
- Test after fresh install (clear data)
- Check all emails arrive (SMTP)

---

*Created: June 2, 2026*

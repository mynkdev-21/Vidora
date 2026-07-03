# Vidora API — Complete Endpoints Reference

> Base URL: `http://10.95.58.78:5001`  
> Production: `https://api.yourdomain.com`

## Auth Legend
| Symbol | Meaning |
|--------|---------|
| 🔓 | Fully public — no auth needed |
| 🔑 | API Key required (`X-API-Key` header) |
| 🔐 | API Key + JWT Bearer Token required |
| 👑 | API Key + Admin JWT required |

---

## 1. Static / Public Endpoints (No Auth)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/health` | 🔓 | Health check |
| GET | `/app-ads.txt` | 🔓 | AdMob app-ads.txt content |
| GET | `/thumbnails/:filename` | 🔓 | Serve thumbnails |
| GET | `/receipts/:filename` | 🔓 | Serve payout receipts |
| GET | `/avatars/:filename` | 🔓 | Serve user avatars |

---

## 2. Auth Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/register` | 🔑 | Register new user |
| POST | `/api/auth/login` | 🔑 | Login → access + refresh token |
| POST | `/api/auth/refresh` | 🔑 | Refresh access token |
| POST | `/api/auth/logout` | 🔑 | Logout |
| GET | `/api/auth/me` | 🔐 | Get current user |
| GET | `/api/auth/verify-email?token=` | 🔑 | Verify email link |
| POST | `/api/auth/resend-verification` | 🔐 | Resend verification email (10 min cooldown) |
| POST | `/api/auth/forgot-password` | 🔑 | Send OTP to email |
| POST | `/api/auth/reset-password` | 🔑 | Reset password with OTP |

---

## 3. File Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/files/trending` | 🔑 | Random active files (home feed) |
| GET | `/api/files/search?q=&type=&page=` | 🔑 | Search files by name/creator |
| POST | `/api/files/bot-upload` | 🔑 + User API Key | Upload via Telegram bot |
| GET | `/api/files` | 🔐 | List my files (paginated) |
| POST | `/api/files/upload` | 🔐 | Upload file (multipart) |
| POST | `/api/files/copy` | 🔐 | Copy file from Vidora share URL |
| POST | `/api/files` | 🔐 | Register file metadata (legacy) |
| GET | `/api/files/:id` | 🔐 | Get single file |
| GET | `/api/files/:id/stats` | 🔐 | File stats (views + earnings) |
| DELETE | `/api/files/:id` | 🔐 | Soft delete file |

---

## 4. Streaming Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/play/:id` | 🔑 | Stream video (file ID or share token, range support) |
| POST | `/api/view/:token` | 🔑 | Count view (IP dedup, 1/hour/file) |
| GET | `/api/share/view/:token` | 🔑 | Get file metadata (share page) |
| GET | `/api/share/stream/:token` | 🔑 | Get temporary signed stream URL |
| GET | `/api/stream/:streamToken/video` | 🔓 | Stream via stream token |
| GET | `/api/stream/:streamToken/playlist.m3u8` | 🔓 | HLS playlist |
| GET | `/api/stream/:streamToken/segment.ts` | 🔓 | HLS segment |
| GET | `/api/share/media/:fileId` | 🔓 | Legacy signed media URL |

---

## 5. Share Token Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/share/:fileId/generate` | 🔐 | Generate share token for file |
| GET | `/api/share/:fileId/token` | 🔐 | Get existing share token |
| DELETE | `/api/share/:fileId/revoke` | 🔐 | Revoke share token |

---

## 6. User Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/users/profile` | 🔐 | Get my profile (views, files, earnings, subscribers) |
| PATCH | `/api/users/profile` | 🔐 | Update name/avatar_url |
| POST | `/api/users/avatar` | 🔐 | Upload profile picture (multipart) |
| PATCH | `/api/users/change-password` | 🔐 | Change password |
| GET | `/api/users/api-key` | 🔐 | Get/create API key |
| GET | `/api/users/payment-methods` | 🔐 | List payment methods |
| POST | `/api/users/payment-methods` | 🔐 | Save payment method |
| GET | `/api/users` | 🔐 (admin role) | List all users |

---

## 7. Earnings Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/earnings` | 🔐 | Earnings history (paginated) |
| GET | `/api/earnings/summary` | 🔐 | Earnings summary + balance |
| GET | `/api/earnings/payouts` | 🔐 | Payout history |
| GET | `/api/earnings/referral-stats` | 🔐 | Referral stats |
| POST | `/api/earnings/payouts` | 🔐 | Request payout |

---

## 8. Subscription / Creator Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/creators/:id` | 🔑 | Creator public profile |
| GET | `/api/creators/:id/files?sort=latest\|popular&page=` | 🔑 | Creator's files (paginated) |
| POST | `/api/subscribe/:creatorId` | 🔐 | Subscribe to creator |
| DELETE | `/api/subscribe/:creatorId` | 🔐 | Unsubscribe from creator |
| PATCH | `/api/subscribe/:creatorId/bell` | 🔐 | Toggle bell notification |
| GET | `/api/subscribe/status/:creatorId` | 🔐 | Check subscription status |
| GET | `/api/subscribe/feed?page=` | 🔐 | Subscribed creators' feed |
| GET | `/api/subscribe/list` | 🔐 | My subscriptions list |

---

## 9. Notification Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/notifications` | 🔐 | Get my notifications (50 latest) |
| PATCH | `/api/notifications/read-all` | 🔐 | Mark all as read |
| PATCH | `/api/notifications/:id/read` | 🔐 | Mark one as read |

---

## 10. Ticket / Support Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/tickets` | 🔐 | Create support ticket |
| GET | `/api/tickets` | 🔐 | My tickets list |
| GET | `/api/tickets/:id` | 🔐 | Ticket detail |
| POST | `/api/tickets/:id/reply` | 🔐 | Reply to ticket |

---

## 11. FCM & Settings Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/fcm/register` | 🔐 | Register FCM token |
| GET | `/api/settings` | 🔑 | App settings (links, rates, AdMob IDs) |
| POST | `/api/contact` | 🔓 | Contact/feedback message |
| GET | `/api/open-url?url=` | 🔓 | Open URL in system browser (desktop app) |

---

## 12. Admin Endpoints (Admin JWT Required)

> Admin login: `POST /api/admin/auth/login`  
> All other admin routes require `Authorization: Bearer <admin_token>`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/admin/auth/login` | 🔑 | Admin login |
| GET | `/api/admin/auth/me` | 👑 | Get admin info |
| PATCH | `/api/admin/auth/update` | 👑 | Update admin profile |
| GET | `/api/admin/stats` | 👑 | Dashboard overview stats |
| GET | `/api/admin/analytics` | 👑 | Growth analytics |
| GET | `/api/admin/users?page=&search=` | 👑 | List users |
| GET | `/api/admin/users/:id` | 👑 | User detail |
| PATCH | `/api/admin/users/:id` | 👑 | Update user (ban/unban/premium) |
| DELETE | `/api/admin/users/:id` | 👑 | Delete user |
| POST | `/api/admin/impersonate/:userId` | 👑 | Generate login token for user |
| GET | `/api/admin/files?page=&search=&status=` | 👑 | List files |
| PATCH | `/api/admin/files/:id` | 👑 | Update file (restore/status) |
| DELETE | `/api/admin/files/:id` | 👑 | Soft delete file |
| POST | `/api/admin/files/:id/notify` | 👑 | Send FCM push for file |
| DELETE | `/api/admin/files-purge/all` | 👑 | Permanently delete all soft-deleted files |
| GET | `/api/admin/payouts?page=&status=` | 👑 | List payouts |
| PATCH | `/api/admin/payouts/:id` | 👑 | Update payout (complete/fail/process) |
| POST | `/api/admin/payouts/:id/receipt` | 👑 | Upload receipt image |
| GET | `/api/admin/messages` | 👑 | Contact messages inbox |
| PATCH | `/api/admin/messages/:id` | 👑 | Update message |
| DELETE | `/api/admin/messages/:id` | 👑 | Delete message |
| GET | `/api/admin/settings` | 👑 | Get all app settings |
| PUT | `/api/admin/settings` | 👑 | Save app settings |
| GET | `/api/admin/tickets` | 👑 | All support tickets |
| GET | `/api/admin/tickets/:id/replies` | 👑 | Ticket replies |
| PATCH | `/api/admin/tickets/:id` | 👑 | Reply to ticket |
| POST | `/api/admin/notifications` | 👑 | Send notification to user |
| POST | `/api/admin/notifications/broadcast` | 👑 | Broadcast to all users |
| GET | `/api/admin/subscriptions/stats` | 👑 | Premium subscription stats |
| PATCH | `/api/admin/subscriptions/:userId` | 👑 | Grant/remove premium |
| GET | `/api/admin/storage` | 👑 | Get storage settings + usage |
| PUT | `/api/admin/storage` | 👑 | Save storage settings |
| POST | `/api/admin/storage/test` | 👑 | Test storage connection |
| GET | `/api/admin/system-info` | 👑 | System info (from env) |

---

## Headers Reference

```
X-API-Key: vdr_live_f9a2c84e1b3d7056ae4f8c2190d3b5e7   (frontend)
X-API-Key: vdr_live_3c7e1a9f2b4d8056cf5e0a1b7d2c4f8e   (mobile)
Authorization: Bearer <access_token>                    (JWT)
Content-Type: application/json
```

---

## Rate Limits

| Endpoint Group | Limit |
|----------------|-------|
| Auth (login, register) | 10 requests / 15 min |
| Token refresh | 30 requests / 15 min |
| Global (all API) | 200 requests / 15 min |

---

*Generated: June 2, 2026*

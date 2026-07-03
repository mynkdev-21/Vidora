# Vidora API — Postman Testing Guide

## Setup Variables (Postman Environment)
```
BASE_URL = http://10.95.58.78:5001
API_KEY = vdr_live_3c7e1a9f2b4d8056cf5e0a1b7d2c4f8e
ACCESS_TOKEN = (fill after login)
ADMIN_TOKEN = (fill after admin login)
```

---

## SECTION 1: AUTH

### 1.1 Register
```
POST {{BASE_URL}}/api/auth/register

Headers:
  X-API-Key: {{API_KEY}}
  Content-Type: application/json

Body:
{
  "name": "Test User",
  "email": "testuser@gmail.com",
  "password": "test1234",
  "referralCode": ""
}

Expected: 201 { success: true, data: { user, accessToken, refreshToken } }
```

---

### 1.2 Login
```
POST {{BASE_URL}}/api/auth/login

Headers:
  X-API-Key: {{API_KEY}}
  Content-Type: application/json

Body:
{
  "email": "testuser@gmail.com",
  "password": "test1234"
}

Expected: 200 { success: true, data: { user, accessToken, refreshToken } }
→ Copy accessToken → set ACCESS_TOKEN variable
```

---

### 1.3 Refresh Token
```
POST {{BASE_URL}}/api/auth/refresh

Headers:
  X-API-Key: {{API_KEY}}
  Content-Type: application/json

Body:
{
  "refreshToken": "your_refresh_token_here"
}

Expected: 200 { data: { accessToken, refreshToken } }
```

---

### 1.4 Get Current User
```
GET {{BASE_URL}}/api/auth/me

Headers:
  X-API-Key: {{API_KEY}}
  Authorization: Bearer {{ACCESS_TOKEN}}

Expected: 200 { data: { user } }
```

---

### 1.5 Forgot Password
```
POST {{BASE_URL}}/api/auth/forgot-password

Headers:
  X-API-Key: {{API_KEY}}
  Content-Type: application/json

Body:
{
  "email": "testuser@gmail.com"
}

Expected: 200 { success: true } → OTP email sent
```

---

### 1.6 Reset Password
```
POST {{BASE_URL}}/api/auth/reset-password

Headers:
  X-API-Key: {{API_KEY}}
  Content-Type: application/json

Body:
{
  "email": "testuser@gmail.com",
  "otp": "123456",
  "newPassword": "newpass123"
}

Expected: 200 { success: true }
```

---

### 1.7 Verify Email
```
GET {{BASE_URL}}/api/auth/verify-email?token=VERIFICATION_TOKEN_FROM_EMAIL

Headers:
  X-API-Key: {{API_KEY}}

Expected: 200 { success: true, message: "Email verified" }
```

---

### 1.8 Resend Verification
```
POST {{BASE_URL}}/api/auth/resend-verification

Headers:
  X-API-Key: {{API_KEY}}
  Authorization: Bearer {{ACCESS_TOKEN}}

Expected: 200 { success: true } → Email sent
Note: 10 min cooldown between requests
```

---

## SECTION 2: FILES

### 2.1 Trending Files (Public)
```
GET {{BASE_URL}}/api/files/trending?limit=20

Headers:
  X-API-Key: {{API_KEY}}

Expected: 200 { data: { files: [...], pagination: {...} } }
```

---

### 2.2 Search Files (Public)
```
GET {{BASE_URL}}/api/files/search?q=test&type=video&page=1

Headers:
  X-API-Key: {{API_KEY}}

Params:
  q = search query (min 2 chars)
  type = video | image | audio | document (optional)
  page = 1 (optional)

Expected: 200 { data: { files, pagination } }
```

---

### 2.3 Upload File
```
POST {{BASE_URL}}/api/files/upload

Headers:
  X-API-Key: {{API_KEY}}
  Authorization: Bearer {{ACCESS_TOKEN}}

Body: form-data
  file = [select file]

Expected: 201 { success: true, data: { file: { id, original_name, share_token, ... } } }
```

---

### 2.4 My Files List
```
GET {{BASE_URL}}/api/files?page=1&limit=20

Headers:
  X-API-Key: {{API_KEY}}
  Authorization: Bearer {{ACCESS_TOKEN}}

Expected: 200 { data: { files, pagination } }
```

---

### 2.5 Get Single File
```
GET {{BASE_URL}}/api/files/FILE_UUID

Headers:
  X-API-Key: {{API_KEY}}
  Authorization: Bearer {{ACCESS_TOKEN}}

Expected: 200 { data: { file } }
```

---

### 2.6 File Stats
```
GET {{BASE_URL}}/api/files/FILE_UUID/stats

Headers:
  X-API-Key: {{API_KEY}}
  Authorization: Bearer {{ACCESS_TOKEN}}

Expected: 200 { data: { id, original_name, view_count, total_earnings } }
```

---

### 2.7 Copy File from Share URL
```
POST {{BASE_URL}}/api/files/copy

Headers:
  X-API-Key: {{API_KEY}}
  Authorization: Bearer {{ACCESS_TOKEN}}
  Content-Type: application/json

Body:
{
  "url": "http://10.59.203.78:8080/v/SHARE_TOKEN"
}

Expected: 201 { success: true, data: { file, share_url } }
```

---

### 2.8 Delete File
```
DELETE {{BASE_URL}}/api/files/FILE_UUID

Headers:
  X-API-Key: {{API_KEY}}
  Authorization: Bearer {{ACCESS_TOKEN}}

Expected: 200 { success: true, message: "File deleted." }
Note: Soft delete — file still in DB with status='deleted'
```

---

## SECTION 3: STREAMING

### 3.1 Play Video (Stream)
```
GET {{BASE_URL}}/api/play/FILE_UUID_OR_SHARE_TOKEN

Headers:
  X-API-Key: {{API_KEY}}
  Range: bytes=0-    (optional, for range requests)

Expected: 200/206 → video bytes streamed
```

---

### 3.2 Count View
```
POST {{BASE_URL}}/api/view/FILE_UUID_OR_SHARE_TOKEN

Headers:
  X-API-Key: {{API_KEY}}

Expected: 200 { success: true, message: "View counted." }
Note: Same IP + same file = max 1 view per hour
```

---

### 3.3 Share Page Metadata
```
GET {{BASE_URL}}/api/share/view/SHARE_TOKEN

Headers:
  X-API-Key: {{API_KEY}}

Expected: 200 { data: { name, type, size, creator, creator_id, views, thumbnail } }
```

---

## SECTION 4: SHARE TOKENS

### 4.1 Generate Share Token
```
POST {{BASE_URL}}/api/share/FILE_UUID/generate

Headers:
  X-API-Key: {{API_KEY}}
  Authorization: Bearer {{ACCESS_TOKEN}}

Expected: 201 { data: { token, file } }
Note: Returns existing token if one exists
```

---

### 4.2 Get File Token
```
GET {{BASE_URL}}/api/share/FILE_UUID/token

Headers:
  X-API-Key: {{API_KEY}}
  Authorization: Bearer {{ACCESS_TOKEN}}

Expected: 200 { data: { token, view_count, created_at } }
```

---

### 4.3 Revoke Share Token
```
DELETE {{BASE_URL}}/api/share/FILE_UUID/revoke

Headers:
  X-API-Key: {{API_KEY}}
  Authorization: Bearer {{ACCESS_TOKEN}}

Expected: 200 { success: true, message: "Share link revoked." }
```

---

## SECTION 5: USER

### 5.1 Get Profile
```
GET {{BASE_URL}}/api/users/profile

Headers:
  X-API-Key: {{API_KEY}}
  Authorization: Bearer {{ACCESS_TOKEN}}

Expected: 200 { data: { user: { id, name, email, total_views, total_files, total_earnings, subscriber_count, is_premium, avatar_url } } }
```

---

### 5.2 Update Profile
```
PATCH {{BASE_URL}}/api/users/profile

Headers:
  X-API-Key: {{API_KEY}}
  Authorization: Bearer {{ACCESS_TOKEN}}
  Content-Type: application/json

Body:
{
  "name": "New Name"
}

Expected: 200 { success: true, message: "Profile updated." }
```

---

### 5.3 Upload Avatar
```
POST {{BASE_URL}}/api/users/avatar

Headers:
  X-API-Key: {{API_KEY}}
  Authorization: Bearer {{ACCESS_TOKEN}}

Body: form-data
  avatar = [select image file, max 5MB]

Expected: 200 { data: { avatar_url: "/avatars/avatar_xxx.jpg" } }
```

---

### 5.4 Change Password
```
PATCH {{BASE_URL}}/api/users/change-password

Headers:
  X-API-Key: {{API_KEY}}
  Authorization: Bearer {{ACCESS_TOKEN}}
  Content-Type: application/json

Body:
{
  "currentPassword": "current123",
  "newPassword": "newpass456"
}

Expected: 200 { success: true }
```

---

### 5.5 Get API Key
```
GET {{BASE_URL}}/api/users/api-key

Headers:
  X-API-Key: {{API_KEY}}
  Authorization: Bearer {{ACCESS_TOKEN}}

Expected: 200 { data: { api_key: "vdr_user_xxx", created_at } }
Note: Auto-creates if none exists
```

---

### 5.6 Payment Methods
```
GET {{BASE_URL}}/api/users/payment-methods

Headers:
  X-API-Key: {{API_KEY}}
  Authorization: Bearer {{ACCESS_TOKEN}}

Expected: 200 { data: { methods: [...] } }
```

---

### 5.7 Save Payment Method
```
POST {{BASE_URL}}/api/users/payment-methods

Headers:
  X-API-Key: {{API_KEY}}
  Authorization: Bearer {{ACCESS_TOKEN}}
  Content-Type: application/json

Body:
{
  "method": "upi",
  "name": "Mayank Singh",
  "account_id": "mayank@upi"
}

method options: "upi" | "paypal" | "bank"

Expected: 201 { success: true }
```

---

## SECTION 6: EARNINGS

### 6.1 Earnings Summary
```
GET {{BASE_URL}}/api/earnings/summary

Headers:
  X-API-Key: {{API_KEY}}
  Authorization: Bearer {{ACCESS_TOKEN}}

Expected: 200 { data: { total_views, rate_per_1000, total, from_views, from_referrals, available_balance, pending_payout, min_payout } }
```

---

### 6.2 Earnings History
```
GET {{BASE_URL}}/api/earnings?page=1&limit=20

Headers:
  X-API-Key: {{API_KEY}}
  Authorization: Bearer {{ACCESS_TOKEN}}

Expected: 200 { data: { earnings, total_earnings, pagination } }
```

---

### 6.3 Payout History
```
GET {{BASE_URL}}/api/earnings/payouts

Headers:
  X-API-Key: {{API_KEY}}
  Authorization: Bearer {{ACCESS_TOKEN}}

Expected: 200 { data: { payouts: [...] } }
```

---

### 6.4 Request Payout
```
POST {{BASE_URL}}/api/earnings/payouts

Headers:
  X-API-Key: {{API_KEY}}
  Authorization: Bearer {{ACCESS_TOKEN}}
  Content-Type: application/json

Body:
{
  "amount": 10.00,
  "method": "upi"
}

Expected: 201 { success: true, data: { payout_id } }
Note: amount must be >= min_payout (from settings)
```

---

### 6.5 Referral Stats
```
GET {{BASE_URL}}/api/earnings/referral-stats

Headers:
  X-API-Key: {{API_KEY}}
  Authorization: Bearer {{ACCESS_TOKEN}}

Expected: 200 { data: { total_referrals, total_earned, referral_code, bonus_percent, referrals: [...] } }
```

---

## SECTION 7: SUBSCRIPTIONS

### 7.1 Creator Profile (Public)
```
GET {{BASE_URL}}/api/creators/CREATOR_USER_UUID

Headers:
  X-API-Key: {{API_KEY}}

Expected: 200 { data: { creator: { id, name, avatar_url, file_count, total_views, subscriber_count } } }
```

---

### 7.2 Creator Files (Public)
```
GET {{BASE_URL}}/api/creators/CREATOR_UUID/files?page=1&sort=latest

Headers:
  X-API-Key: {{API_KEY}}

Params:
  page = 1
  sort = latest | popular

Expected: 200 { data: { files, pagination } }
```

---

### 7.3 Subscribe
```
POST {{BASE_URL}}/api/subscribe/CREATOR_UUID

Headers:
  X-API-Key: {{API_KEY}}
  Authorization: Bearer {{ACCESS_TOKEN}}

Expected: 200 { success: true, message: "Subscribed!" }
```

---

### 7.4 Unsubscribe
```
DELETE {{BASE_URL}}/api/subscribe/CREATOR_UUID

Headers:
  X-API-Key: {{API_KEY}}
  Authorization: Bearer {{ACCESS_TOKEN}}

Expected: 200 { success: true }
```

---

### 7.5 Toggle Bell
```
PATCH {{BASE_URL}}/api/subscribe/CREATOR_UUID/bell

Headers:
  X-API-Key: {{API_KEY}}
  Authorization: Bearer {{ACCESS_TOKEN}}
  Content-Type: application/json

Body:
{
  "notify": true
}

Expected: 200 { success: true, message: "Notifications ON" }
```

---

### 7.6 Subscription Status
```
GET {{BASE_URL}}/api/subscribe/status/CREATOR_UUID

Headers:
  X-API-Key: {{API_KEY}}
  Authorization: Bearer {{ACCESS_TOKEN}}

Expected: 200 { data: { subscribed: true, notify: true } }
```

---

### 7.7 My Feed
```
GET {{BASE_URL}}/api/subscribe/feed?page=1&limit=20

Headers:
  X-API-Key: {{API_KEY}}
  Authorization: Bearer {{ACCESS_TOKEN}}

Expected: 200 { data: { files, pagination } }
Note: Only files from subscribed creators
```

---

### 7.8 My Subscriptions List
```
GET {{BASE_URL}}/api/subscribe/list

Headers:
  X-API-Key: {{API_KEY}}
  Authorization: Bearer {{ACCESS_TOKEN}}

Expected: 200 { data: { subscriptions: [{ id, name, avatar_url, file_count, notify }] } }
```

---

## SECTION 8: NOTIFICATIONS

### 8.1 Get Notifications
```
GET {{BASE_URL}}/api/notifications

Headers:
  X-API-Key: {{API_KEY}}
  Authorization: Bearer {{ACCESS_TOKEN}}

Expected: 200 { data: { notifications: [...], unread: 3 } }
```

---

### 8.2 Mark All Read
```
PATCH {{BASE_URL}}/api/notifications/read-all

Headers:
  X-API-Key: {{API_KEY}}
  Authorization: Bearer {{ACCESS_TOKEN}}

Expected: 200 { success: true }
```

---

### 8.3 Mark One Read
```
PATCH {{BASE_URL}}/api/notifications/NOTIFICATION_UUID/read

Headers:
  X-API-Key: {{API_KEY}}
  Authorization: Bearer {{ACCESS_TOKEN}}

Expected: 200 { success: true }
```

---

## SECTION 9: TICKETS

### 9.1 Create Ticket
```
POST {{BASE_URL}}/api/tickets

Headers:
  X-API-Key: {{API_KEY}}
  Authorization: Bearer {{ACCESS_TOKEN}}
  Content-Type: application/json

Body:
{
  "subject": "Payment not received",
  "message": "I requested a payout 5 days ago but haven't received it."
}

Expected: 201 { success: true, data: { ticket } }
```

---

### 9.2 My Tickets
```
GET {{BASE_URL}}/api/tickets

Headers:
  X-API-Key: {{API_KEY}}
  Authorization: Bearer {{ACCESS_TOKEN}}

Expected: 200 { data: { tickets: [...] } }
```

---

### 9.3 Ticket Detail
```
GET {{BASE_URL}}/api/tickets/TICKET_UUID

Headers:
  X-API-Key: {{API_KEY}}
  Authorization: Bearer {{ACCESS_TOKEN}}

Expected: 200 { data: { ticket, replies: [...] } }
```

---

### 9.4 Reply to Ticket
```
POST {{BASE_URL}}/api/tickets/TICKET_UUID/reply

Headers:
  X-API-Key: {{API_KEY}}
  Authorization: Bearer {{ACCESS_TOKEN}}
  Content-Type: application/json

Body:
{
  "message": "Following up on my issue."
}

Expected: 201 { success: true }
```

---

## SECTION 10: PUBLIC / MISC

### 10.1 App Settings
```
GET {{BASE_URL}}/api/settings

Headers:
  X-API-Key: {{API_KEY}}

Expected: 200 { data: { website_url, telegram_url, ads_enabled, admob_app_id, admob_banner_id, earning_rate, min_payout, ... } }
```

---

### 10.2 Contact Message
```
POST {{BASE_URL}}/api/contact

Body (JSON, no auth needed):
{
  "name": "Mayank",
  "email": "test@gmail.com",
  "message": "Hello, I have a question.",
  "source": "landing"
}

Expected: 201 { success: true }
```

---

### 10.3 Register FCM Token
```
POST {{BASE_URL}}/api/fcm/register

Headers:
  X-API-Key: {{API_KEY}}
  Authorization: Bearer {{ACCESS_TOKEN}}
  Content-Type: application/json

Body:
{
  "token": "FCM_DEVICE_TOKEN_HERE"
}

Expected: 200 { success: true }
Note: Empty token = disable notifications
```

---

### 10.4 Health Check
```
GET {{BASE_URL}}/health

No headers needed

Expected: 200 { success: true, status: "ok", timestamp: "..." }
```

---

## SECTION 11: ADMIN

### 11.1 Admin Login
```
POST {{BASE_URL}}/api/admin/auth/login

Headers:
  X-API-Key: {{API_KEY}}
  Content-Type: application/json

Body:
{
  "email": "admin@vidora.app",
  "password": "admin123"
}

Expected: 200 { data: { token, admin } }
→ Copy token → set ADMIN_TOKEN variable
```

---

### 11.2 Admin Stats
```
GET {{BASE_URL}}/api/admin/stats

Headers:
  X-API-Key: {{API_KEY}}
  Authorization: Bearer {{ADMIN_TOKEN}}

Expected: 200 { data: { total_users, total_files, total_payouts, total_views } }
```

---

### 11.3 Admin Users List
```
GET {{BASE_URL}}/api/admin/users?page=1&limit=15&search=mayank

Headers:
  X-API-Key: {{API_KEY}}
  Authorization: Bearer {{ADMIN_TOKEN}}

Expected: 200 { data: { users, pagination } }
```

---

### 11.4 Admin User Detail
```
GET {{BASE_URL}}/api/admin/users/USER_UUID

Headers:
  X-API-Key: {{API_KEY}}
  Authorization: Bearer {{ADMIN_TOKEN}}

Expected: 200 { data: { user, files, payouts, earnings, api_key } }
```

---

### 11.5 Ban/Unban User
```
PATCH {{BASE_URL}}/api/admin/users/USER_UUID

Headers:
  X-API-Key: {{API_KEY}}
  Authorization: Bearer {{ADMIN_TOKEN}}
  Content-Type: application/json

Body:
{
  "is_active": false
}

Expected: 200 { success: true }
```

---

### 11.6 Login as User (Impersonate)
```
POST {{BASE_URL}}/api/admin/impersonate/USER_UUID

Headers:
  X-API-Key: {{API_KEY}}
  Authorization: Bearer {{ADMIN_TOKEN}}

Expected: 200 { data: { accessToken, user } }
Note: Token valid for 1 hour. Use to login as that user.
```

---

### 11.7 Admin Files
```
GET {{BASE_URL}}/api/admin/files?page=1&search=&status=deleted

Headers:
  X-API-Key: {{API_KEY}}
  Authorization: Bearer {{ADMIN_TOKEN}}

status: active | deleted | processing
Expected: 200 { data: { files, pagination } }
```

---

### 11.8 Restore File
```
PATCH {{BASE_URL}}/api/admin/files/FILE_UUID

Headers:
  X-API-Key: {{API_KEY}}
  Authorization: Bearer {{ADMIN_TOKEN}}
  Content-Type: application/json

Body:
{
  "status": "active"
}

Expected: 200 { success: true }
```

---

### 11.9 Purge All Deleted Files
```
DELETE {{BASE_URL}}/api/admin/files-purge/all

Headers:
  X-API-Key: {{API_KEY}}
  Authorization: Bearer {{ADMIN_TOKEN}}

Expected: 200 { success: true, message: "Purged X files.", data: { count: X } }
⚠️ IRREVERSIBLE — permanently deletes from DB + storage
```

---

### 11.10 Send FCM Push for File
```
POST {{BASE_URL}}/api/admin/files/FILE_UUID/notify

Headers:
  X-API-Key: {{API_KEY}}
  Authorization: Bearer {{ADMIN_TOKEN}}

Expected: 200 { success: true, message: "Push sent to X devices." }
```

---

### 11.11 Admin Payouts
```
GET {{BASE_URL}}/api/admin/payouts?page=1&status=pending

Headers:
  X-API-Key: {{API_KEY}}
  Authorization: Bearer {{ADMIN_TOKEN}}

status: pending | processing | completed | failed
Expected: 200 { data: { payouts, pagination } }
```

---

### 11.12 Update Payout Status
```
PATCH {{BASE_URL}}/api/admin/payouts/PAYOUT_UUID

Headers:
  X-API-Key: {{API_KEY}}
  Authorization: Bearer {{ADMIN_TOKEN}}
  Content-Type: application/json

Body (complete):
{
  "status": "completed",
  "transaction_id": "TXN123456",
  "notes": "Paid via UPI"
}

Body (fail):
{
  "status": "failed",
  "notes": "Invalid UPI ID"
}

Expected: 200 { success: true }
Note: Sends email to user + referral bonus on completed
```

---

### 11.13 Broadcast Notification
```
POST {{BASE_URL}}/api/admin/notifications/broadcast

Headers:
  X-API-Key: {{API_KEY}}
  Authorization: Bearer {{ADMIN_TOKEN}}
  Content-Type: application/json

Body:
{
  "title": "New Feature!",
  "message": "Check out the new feed feature in your app."
}

Expected: 200 { success: true, message: "Broadcast sent to X users." }
```

---

### 11.14 Send Notification to User
```
POST {{BASE_URL}}/api/admin/notifications

Headers:
  X-API-Key: {{API_KEY}}
  Authorization: Bearer {{ADMIN_TOKEN}}
  Content-Type: application/json

Body:
{
  "user_id": "USER_UUID",
  "title": "Payout Update",
  "message": "Your payout has been processed.",
  "type": "custom"
}

Expected: 200 { success: true }
```

---

### 11.15 Get/Save Settings
```
GET {{BASE_URL}}/api/admin/settings

Headers:
  X-API-Key: {{API_KEY}}
  Authorization: Bearer {{ADMIN_TOKEN}}

Expected: 200 { data: { settings: [{ id, value }] } }

---

PUT {{BASE_URL}}/api/admin/settings

Headers:
  X-API-Key: {{API_KEY}}
  Authorization: Bearer {{ADMIN_TOKEN}}
  Content-Type: application/json

Body:
{
  "settings": {
    "earning_rate": "5",
    "min_payout": "5",
    "ads_enabled": "true",
    "admob_banner_id": "ca-app-pub-xxx/xxx",
    "admob_rewarded_id": "ca-app-pub-xxx/xxx",
    "telegram_url": "https://t.me/vidorabot"
  }
}

Expected: 200 { success: true }
```

---

### 11.16 Grant/Remove Premium
```
PATCH {{BASE_URL}}/api/admin/subscriptions/USER_UUID

Headers:
  X-API-Key: {{API_KEY}}
  Authorization: Bearer {{ADMIN_TOKEN}}
  Content-Type: application/json

Body:
{
  "is_premium": true
}

Expected: 200 { success: true, message: "Premium granted." }
```

---

### 11.17 Storage Config
```
GET {{BASE_URL}}/api/admin/storage

Headers:
  X-API-Key: {{API_KEY}}
  Authorization: Bearer {{ADMIN_TOKEN}}

Expected: 200 { data: { settings, local_used, local_files } }

---

PUT {{BASE_URL}}/api/admin/storage

Body:
{
  "settings": {
    "storage_provider": "b2",
    "storage_b2_endpoint": "https://s3.us-west-004.backblazeb2.com",
    "storage_b2_region": "us-west-004",
    "storage_b2_key_id": "your-key-id",
    "storage_b2_app_key": "your-app-key",
    "storage_b2_bucket": "vidora-files"
  }
}

---

POST {{BASE_URL}}/api/admin/storage/test

Body:
{
  "provider": "b2",
  "settings": { ...same as above... }
}

Expected: 200 { success: true, message: "Connection successful!" }
```

---

## Quick Test Flow (Copy-Paste Order)

1. `POST /api/auth/register` → create account
2. `POST /api/auth/login` → get ACCESS_TOKEN
3. `GET /api/users/profile` → verify profile
4. `POST /api/files/upload` → upload a file
5. `POST /api/share/FILE_ID/generate` → get share token
6. `GET /api/share/view/SHARE_TOKEN` → verify share page
7. `POST /api/view/FILE_ID` → count a view
8. `GET /api/earnings/summary` → check earnings
9. `POST /api/admin/auth/login` → get ADMIN_TOKEN
10. `GET /api/admin/users` → list users
11. `PATCH /api/admin/payouts/PAYOUT_ID` → process payout

---

*Vidora API Postman Guide — June 2026*

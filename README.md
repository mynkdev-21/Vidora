# Vidora 🎬

> A full-featured video hosting and monetisation platform — built solo from architecture to deployment.

![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat&logo=nodedotjs&logoColor=white)
![Kotlin](https://img.shields.io/badge/Kotlin-7F52FF?style=flat&logo=kotlin&logoColor=white)
![MySQL](https://img.shields.io/badge/MySQL-4479A1?style=flat&logo=mysql&logoColor=white)
![Firebase](https://img.shields.io/badge/Firebase-FFCA28?style=flat&logo=firebase&logoColor=black)
![Express](https://img.shields.io/badge/Express-000000?style=flat&logo=express&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat&logo=typescript&logoColor=white)
![Tauri](https://img.shields.io/badge/Tauri-24C8D8?style=flat&logo=tauri&logoColor=white)
![Java](https://img.shields.io/badge/Java-ED8B00?style=flat&logo=openjdk&logoColor=white)

---

## 📱 Overview

Vidora is a complete video hosting and monetisation platform built for content creators and OTT startups. Creators upload files, share links, and earn from views. Consumers watch via Android app, web, or desktop.

Designed, built, and deployed **100% solo** — from backend architecture to Android app to web dashboard to desktop app.

---

## ✨ Features

### 🔐 Auth & Users
- OTP-based authentication with email verification
- JWT access + refresh token rotation
- Referral system, banned user detection
- Avatar upload, profile management

### 📹 Video & Files
- Video upload with auto thumbnail (FFmpeg)
- Streaming with range support (local + cloud)
- Copy Files (Vidora to Vidora) — no storage duplication
- Share tokens, view count anti-fraud (1 view/hour/IP)
- Soft delete — earnings preserved on file deletion

### 💰 Monetisation
- Dynamic earning rate per view
- Minimum payout system with referral bonuses
- Three-tier Google Play subscription (₹199/mo · ₹499/3mo · ₹1499/yr)
- Dynamic AdMob IDs from admin panel (Banner, Interstitial, Rewarded)

### 📡 Real-time & Notifications
- Firebase FCM push notifications
- In-app notification bell with unread count
- Subscriber notifications when creator uploads
- Socket.IO live view counts

### 👥 Creator & Subscription System
- Subscribe/Unsubscribe from any creator
- Bell toggle per creator (notify on/off)
- YouTube-style feed — subscribed creators' latest uploads
- Creator profile with avatar, stats, Latest/Popular sort

### ☁️ Cloud Storage
- Storage Adapter Pattern — pluggable providers
- Supports: Local · Cloudflare R2 · Backblaze B2 · BunnyCDN · Custom S3
- Currently active: **Backblaze B2**
- Admin can switch providers with one click

### 🤖 Telegram Bot
- Link account via API key
- Send file → upload to Vidora → get share URL
- `/copy <link>` — copy any Vidora file to your account
- Auto FCM push to subscribers on bot upload

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Backend | Node.js 24, Express 4 |
| Database | MySQL 9 — 18 tables |
| Frontend | React 19, TanStack Router, Tailwind CSS 4 |
| Mobile | Java, ExoPlayer, Retrofit, Glide, AdMob, Firebase, Play Billing |
| Desktop | Tauri v2 (Rust), GitHub Actions CI/CD |
| Telegram | node-telegram-bot-api |
| Storage | Backblaze B2 (active), supports R2/Bunny/S3/Local |
| Auth | JWT, OTP, Nodemailer |
| Real-time | Socket.IO, Firebase FCM |
| CI/CD | GitHub Actions (auto-build Windows .exe + Mac .dmg) |

---

## 📂 Project Structure

```
Vidora/
├── backend/                  # Node.js + Express API (18 tables)
│   ├── src/
│   │   ├── controllers/
│   │   ├── routes/
│   │   ├── models/
│   │   └── middleware/
│   ├── uploads/
│   ├── .env.example
│   └── package.json
├── vidora-andoid/            # Android app (Java + Firebase)
├── vidora-desktop/           # Desktop app (Tauri v2 + Rust)
├── web_dashboard/            # Creator dashboard (React 19 + TypeScript)
│   ├── src/
│   ├── public/
│   └── package.json
└── README.md
```

---

## 🚀 Getting Started

### Backend

```bash
git clone https://github.com/mynkdev-21/Vidora.git
cd Vidora/backend
npm install
cp .env.example .env
# Fill in DB, Firebase, SMTP, and storage credentials
npm start
```

### Web Dashboard

```bash
cd Vidora/web_dashboard
npm install
npm run dev
```

### Android App

Open `vidora-andoid/` in Android Studio and run on device or emulator.

### Desktop App

```bash
cd Vidora/vidora-desktop
cargo tauri dev
```

---

## ⚙️ Environment Variables

```env
PORT=3000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=videora
JWT_SECRET=
SMTP_HOST=
SMTP_USER=
SMTP_PASS=
FIREBASE_PROJECT_ID=
BASE_URL=
FRONTEND_URL=
```

---

## 📊 Scaling Roadmap

| Users | Infrastructure | Cost |
|---|---|---|
| 1K | Current setup — fine | ₹0 |
| 5K | Redis cache (trending, profiles) | €5/mo |
| 20K | PM2 cluster + MySQL indexes | €0 |
| 50K | MySQL Read Replica + Cloudflare CDN | €20/mo |
| 1L+ | Load Balancer + 3 Node instances + Redis Cluster | €60/mo |

```
Cloudflare CDN → Load Balancer → Node ×3 → Redis + MySQL Primary + Replicas → B2 Storage
```

---

## 🔲 Pending

- [ ] Cloudflare CDN setup
- [ ] Video quality selector
- [ ] Production deployment (domain, SSL, real AdMob IDs)
- [ ] Play Store listing + Billing products setup
- [ ] Apple Developer account for signed Mac app

---

## 📄 License

MIT License — feel free to use with credit.

---

Built with ❤️ by [Mayank Singh](https://github.com/mynkdev-21) · [LinkedIn](https://linkedin.com/in/mynk-dev) · [Portfolio](https://mayankdeveloper.site)

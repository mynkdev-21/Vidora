# Vidora 🎬

> A full-featured video hosting and monetisation platform — built solo from architecture to deployment.

![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat&logo=nodedotjs&logoColor=white)
![Kotlin](https://img.shields.io/badge/Kotlin-7F52FF?style=flat&logo=kotlin&logoColor=white)
![MySQL](https://img.shields.io/badge/MySQL-4479A1?style=flat&logo=mysql&logoColor=white)
![Firebase](https://img.shields.io/badge/Firebase-FFCA28?style=flat&logo=firebase&logoColor=black)
![Express](https://img.shields.io/badge/Express-000000?style=flat&logo=express&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat&logo=typescript&logoColor=white)

---

## 📱 Overview

Vidora is a complete video hosting and monetisation platform built for content creators and OTT startups. Designed, built, and deployed solo — from backend architecture to Android app to web dashboard.

---

## ✨ Features

- 🔐 OTP-based authentication with email verification
- 📹 Video upload, streaming, and management
- 💳 Three-tier Google Play subscription (Basic · Pro · Premium)
- 📊 Real-time live view counts via Socket.IO
- 📱 Native Android app with ExoPlayer playback
- 🖥️ Desktop app built with Tauri
- 🌐 Web dashboard for content management
- 🔔 Firebase push notifications
- 💰 AdMob ad integration
- 👤 User profiles and content management

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Backend | Node.js, Express.js |
| Database | MySQL |
| Mobile | Kotlin, ExoPlayer, Retrofit |
| Desktop | Tauri, Rust |
| Web Dashboard | React, TypeScript, Vite |
| Auth | OTP, Nodemailer |
| Real-time | Socket.IO |
| Notifications | Firebase FCM |
| Monetisation | Google Play Billing, AdMob |
| Deployment | Nginx, Linux Server |

---

## 📂 Project Structure

```
Vidora/
├── backend/                  # Node.js + Express API
│   ├── src/
│   │   ├── controllers/
│   │   ├── routes/
│   │   ├── models/
│   │   └── middleware/
│   ├── uploads/
│   ├── .env.example
│   └── package.json
├── vidora-andoid/            # Android app (Kotlin)
├── vidora-desktop/           # Desktop app (Tauri + Rust)
├── web_dashboard/            # Web dashboard (React + TypeScript)
│   ├── src/
│   ├── public/
│   └── package.json
└── README.md
```

---

## 🚀 Getting Started

### Backend

```bash
# Clone the repo
git clone https://github.com/mynkdev-21/Vidora.git

# Install dependencies
cd Vidora/backend
npm install

# Setup environment
cp .env.example .env
# Fill in your DB, Firebase, and SMTP credentials

# Run server
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

Create `.env` in `/backend`:

```env
PORT=3000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=vidora
JWT_SECRET=
SMTP_HOST=
SMTP_USER=
SMTP_PASS=
FIREBASE_PROJECT_ID=
```

---

## 📄 License

MIT License — feel free to use with credit.

---

Built with ❤️ by [Mayank Singh](https://github.com/mynkdev-21) · [LinkedIn](https://linkedin.com/in/mynk-dev) · [Portfolio](https://mayankdeveloper.site)

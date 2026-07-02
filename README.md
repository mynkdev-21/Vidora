# Vidora 🎬

> A full-featured video hosting and monetisation platform — built solo from architecture to deployment.

![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat&logo=nodedotjs&logoColor=white)
![Kotlin](https://img.shields.io/badge/Kotlin-7F52FF?style=flat&logo=kotlin&logoColor=white)
![MySQL](https://img.shields.io/badge/MySQL-4479A1?style=flat&logo=mysql&logoColor=white)
![Firebase](https://img.shields.io/badge/Firebase-FFCA28?style=flat&logo=firebase&logoColor=black)
![Express](https://img.shields.io/badge/Express-000000?style=flat&logo=express&logoColor=white)

---

## 📱 Overview

Vidora is a complete video hosting platform with subscription monetisation, built for content creators and OTT startups.

## ✨ Features

- 🔐 OTP-based authentication with email verification
- 📹 Video upload, streaming, and management
- 💳 Three-tier Google Play subscription (Basic · Pro · Premium)
- 📊 Real-time live view counts via Socket.IO
- 📱 Native Android app with ExoPlayer playback
- 🔔 Firebase push notifications
- 💰 AdMob ad integration
- 👤 User profiles and content management

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Backend | Node.js, Express.js |
| Database | MySQL |
| Mobile | Kotlin, ExoPlayer, Retrofit |
| Auth | OTP, Nodemailer |
| Real-time | Socket.IO |
| Notifications | Firebase FCM |
| Monetisation | Google Play Billing, AdMob |
| Deployment | Nginx, Linux Server |

## 📂 Project Structure

```
vidora/
├── backend/
│   ├── controllers/
│   ├── routes/
│   ├── models/
│   └── middleware/
├── android/
│   ├── app/
│   └── gradle/
└── README.md
```

## 🚀 Getting Started

```bash
# Clone the repo
git clone https://github.com/mynkdev-21/vidora.git

# Install dependencies
cd vidora/backend
npm install

# Setup environment
cp .env.example .env

# Run server
npm start
```

## 📄 License

MIT License — feel free to use with credit.

---

Built with ❤️ by [Mayank Singh](https://github.com/mynkdev-21)

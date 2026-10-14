# Waydrop 📦⚡
> **Get it moved. Or get paid to move it. Any campus. Any street.**

Waydrop is a hyper-local peer-to-peer errand and micro-logistics platform designed specifically for Nigerian university campuses and high-density communities. Students post everyday errands (e.g., *"Bring my calculator from Moremi to LT3 for ₦500"*), and fellow students already walking those routes accept and fulfill them.

---

## 📁 Repository Structure

```
waydrop/
├── backend/          # Laravel 11/12 API backend (Escrow, Termii, Squad, Ably, Agora)
├── waydrop/          # Expo React Native mobile client (iOS & Android)
└── README.md
```

---

## ✨ Key Features

- **P2P Errand Marketplace**: Post any request in one line with custom offers and automated route pricing suggestions.
- **Escrow-Protected Wallet**: Funds are locked in escrow upon task creation and only released when the recipient provides a secret 4-digit completion PIN.
- **Hybrid Student KYC**: Automated AI biometric liveness & face matching (Smile ID / Prembly) + NUBAN account name verification + student ID review.
- **In-App VoIP Calling**: Encrypted, peer-to-peer audio calls powered by Agora.io — runners and requesters communicate without telecom airtime or phone number exposure.
- **Live Campus Radar**: Real-time WebSocket errand broadcasting and active runner map visualization powered by Ably.
- **Local Nigerian Payments**: Instant wallet funding (Cards, USSD, Virtual Accounts) and direct bank payouts via Squad / Zainpay.

---

## 🛠️ Architecture & Tech Stack

- **Frontend**: React Native, Expo SDK (New Architecture), Expo Router, Reanimated
- **Backend**: Laravel 11/12 (PHP 8.2+), Action-Domain-Driven Design (AD3)
- **Database & Cache**: PostgreSQL / MySQL 8.0, Redis (Horizon queues)
- **Real-Time & WebSockets**: Ably Channels
- **In-App Voice**: Agora.io RTC Engine
- **SMS & OTP**: Termii
- **Payments & Payouts**: Squad (HabariPay / GTCO) / Zainpay
- **Identity & Biometrics**: Smile ID / Prembly
- **Media Storage**: Cloudflare R2 (S3-compatible, zero egress)

---

## 🚀 Getting Started

### Mobile App (`/waydrop`)
```bash
cd waydrop
npm install
npm run start
```

### Backend (`/backend`)
Detailed backend architecture and technical design specifications are documented in:
[`waydrop/BACKEND_ARCHITECTURE.md`](waydrop/BACKEND_ARCHITECTURE.md).

```bash
cd backend
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate
php artisan serve
```

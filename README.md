# Pulse - Ultra-Lightweight High-Performance Team Chat

> **Discord Alternative** for high-performance development teams: Instant chat, low-latency audio/voice rooms, screen sharing, and ultra-lightweight desktop footprint (<100MB RAM idle).

---

## 🚀 Tech Stack

- **Client**: Tauri v2 + React (TypeScript) + Vite + Tailwind CSS + Zustand + TanStack Virtual + LiveKit Web SDK + Dexie.js (IndexedDB local caching).
- **Backend**: ASP.NET Core (.NET 9 Web API) + SignalR (Real-time Hub) + Entity Framework Core (PostgreSQL) + MediatR (CQRS) + FluentValidation.
- **Database & Presence**: PostgreSQL (Persistent storage via Supabase) + Redis (Presence tracking & distributed event messaging).
- **Media SFU**: LiveKit SFU (WebRTC Audio & Screen Share).
- **CI/CD**: GitHub Actions.

---

## 📂 Architecture Overview

```text
Pulse/
├── apps/
│   ├── backend/                 # ASP.NET Core Clean Architecture
│   │   ├── src/Pulse.Domain/    # Entities, Enums, Domain Events
│   │   ├── src/Pulse.Application/# MediatR CQRS, FluentValidation, Interfaces
│   │   ├── src/Pulse.Infrastructure/ # EF Core DbContext (Supabase), Redis, JWT
│   │   ├── src/Pulse.WebAPI/    # SignalR ChatHub, Controllers, Middlewares
│   │   └── tests/               # Domain, Application & Integration Tests
│   └── desktop/                 # Tauri v2 + React 18 + TypeScript Client
├── infra/
│   ├── docker/                  # Backend Dockerfile
│   └── livekit/                 # LiveKit SFU local RTC configuration
├── .github/workflows/           # Automated CI/CD pipelines
├── docker-compose.yml           # PostgreSQL, Redis, LiveKit SFU, WebAPI
└── .env                         # Master configuration (Environment variables)
```

---

## ⚡ Quick Start (Local Development)

### 1. Environment Configuration
Pulse uses `.env` files for configuration:
- Copy `.env.example` to `.env` in the root folder and configure your PostgreSQL database credentials and keys.
- Copy `apps/desktop/.env.example` to `apps/desktop/.env`.

### 2. Run Database Migrations
```bash
dotnet ef database update -p apps/backend/src/Pulse.Infrastructure/Pulse.Infrastructure.csproj -s apps/backend/src/Pulse.WebAPI/Pulse.WebAPI.csproj
```

### 3. Start Backend Web API (Port 5000)
```powershell
.\start-backend.ps1
# or
dotnet run --project apps/backend/src/Pulse.WebAPI --urls "http://localhost:5000"
```

### 4. Start Desktop Client (Port 1420)
```powershell
.\start-desktop.ps1
# or
cd apps/desktop
npm run dev
```

To run as native desktop application via Tauri v2:
```bash
cd apps/desktop
npm run tauri dev
```

---

## 🧪 Testing Suite

Run all backend unit & integration tests:
```bash
dotnet test apps/backend/Pulse.sln
```

Run frontend unit tests:
```bash
cd apps/desktop
npm test
```

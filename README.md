# TMJ Diagnosis / Joint Monitor System (BMEIC)

Biomedical Engineering (BMEIC) project that combines a wearable/IoT measurement device and a full-stack web application for monitoring **jaw joint (TMJ) movement (flexion angle)** and **acoustic (audio) signals** in real time, with saved sessions for clinical follow-up.

This repository mainly contains the web system at `joint-monitor-web/`.

## What’s inside

- **`joint-monitor-web/` (main app)**: Next.js full-stack web application (Doctor/Patient portals)
- **Root `package.json` (optional)**: small set of dependencies (TensorFlow.js / webcam / PeerJS) used for experiments or standalone scripts (not required to run `joint-monitor-web`)

## Tech stack (web app)

- **Web**: Next.js (App Router) + React
- **UI**: Tailwind CSS + shadcn/ui
- **Auth**: NextAuth (credentials, role-based access)
- **Database**: Prisma + **PostgreSQL**
- **Realtime transport**: MQTT over WebSocket (WSS)
- **Charts**: Recharts
- **Optional remote access**: Cloudflare Tunnel

## Core features

- **Doctor portal**
  - Manage a private patient list (per doctor account)
  - Generate patient access codes
  - Live monitoring (angle + acoustic signals)
  - Save measurement sessions (duration, notes, AI fields, optional TMJ images: front/right/left)
- **Patient portal**
  - Login using Patient ID + access code
  - View measurement history / past sessions

## Web app structure (quick map)

Inside `joint-monitor-web/`:

- **`app/`**: Next.js routes (UI pages)
- **`app/api/`**: API routes (auth, patients, sessions)
- **`prisma/schema.prisma`**: DB schema (Doctor/Patient/Session/HospitalAccount)
- **`prisma/seed.ts`**: seed script (optional)
- **`middleware.ts`**: route protection (currently matches `/doctor/*`)

## Prerequisites

- Node.js + npm
- PostgreSQL database (local or hosted)
- (Optional) Cloudflare Tunnel:
  - `cloudflared` installed, or use `npx untun`

## Setup (developer)

From the repository root:

```bash
cd joint-monitor-web
npm install
```

## Environment variables

Create `joint-monitor-web/.env` (do **not** commit it). Minimum required:

```bash
# Prisma (PostgreSQL)
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DB_NAME?schema=public"

# Optional but recommended for migrations/introspection (can be same as DATABASE_URL)
DIRECT_URL="postgresql://USER:PASSWORD@HOST:PORT/DB_NAME?schema=public"

# Must match the browser-accessible URL (localhost OR tunnel URL)
NEXTAUTH_URL="http://localhost:3000"

# A long random secret for NextAuth sessions/JWT
NEXTAUTH_SECRET="REPLACE_WITH_LONG_RANDOM_SECRET"
```

Initialize Prisma:

```bash
npx prisma generate
npx prisma db push
```

(Optional) seed demo data:

```bash
npx prisma db seed
```

## Run locally

```bash
npm run dev
```

Open `http://localhost:3000`.

Database UI (optional):

```bash
npx prisma studio
```

## Remote access for mobile testing (Cloudflare Tunnel)

NextAuth requires `NEXTAUTH_URL` to match the public URL:

1. Start the tunnel:

```bash
npx untun tunnel http://localhost:3000
```

2. Copy the generated `https://<something>.trycloudflare.com` URL.
3. Update `NEXTAUTH_URL` in `joint-monitor-web/.env`.
4. Restart the dev server.

### Windows helper script

//If you have `cloudflared` installed at `C:\Program Files (x86)\cloudflared\cloudflared.exe`:

```powershell
cd joint-monitor-web
.\auto-run.ps1
```

It starts the dev server, opens a tunnel, and updates `NEXTAUTH_URL` in `.env` automatically.

## Scripts (web app)

From `joint-monitor-web/`:

- `npm run dev`: start development server
- `npm run build`: production build
- `npm run start`: start production server
- `npm run lint`: lint

---

Developed by **MiceBach** — Medical Project BMEIC
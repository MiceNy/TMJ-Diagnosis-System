# TMJ Diagnosis System - Quick Reference Guide

## 📋 Architecture Overview

This is a **full-stack medical IoT application** for TMJ (temporomandibular joint) diagnosis that combines:
- 🔧 **IoT Hardware**: Arduino device measuring jaw flexion angle & acoustic signals
- 🌐 **Web Application**: Next.js full-stack app with Doctor & Patient portals
- 💾 **Database**: PostgreSQL storing all patient data, sessions, and analysis
- ⚡ **Real-time**: MQTT over WebSocket for live data streaming
- 🤖 **AI**: Machine learning classification for TMJ conditions

---

## 🎯 Quick Navigation

### For Understanding System Architecture
1. **Start here**: `SYSTEM_ARCHITECTURE.md` - Diagrams 1-12
   - Block diagrams showing all major components
   - Data flows through the system
   - Authentication & user workflows
   - Database schema

### For Technical Implementation Details
2. **Dive deeper**: `TECHNICAL_ARCHITECTURE.md` - Diagrams 13-26
   - Component hierarchies
   - Code-level interactions
   - Security & error handling
   - DevOps & monitoring

---

## 📊 All Diagrams at a Glance

| # | Diagram Name | Purpose | File |
|---|---|---|---|
| 1 | System Architecture Block Diagram | Overall component layout | SYSTEM_ARCHITECTURE.md |
| 2 | Data Flow Diagram | How data moves through system | SYSTEM_ARCHITECTURE.md |
| 3 | User Authentication Flow | Login processes for all user types | SYSTEM_ARCHITECTURE.md |
| 4 | Doctor Workflow Flowchart | Doctor's complete user journey | SYSTEM_ARCHITECTURE.md |
| 5 | Patient Workflow Flowchart | Patient's session viewing journey | SYSTEM_ARCHITECTURE.md |
| 6 | Database Schema (ER Diagram) | Entity relationships & structure | SYSTEM_ARCHITECTURE.md |
| 7 | API Endpoint Architecture | REST API organization | SYSTEM_ARCHITECTURE.md |
| 8 | Real-time Data Flow with MQTT | Sequence diagram of live updates | SYSTEM_ARCHITECTURE.md |
| 9 | Complete System Interaction Flow | End-to-end user flow from setup to review | SYSTEM_ARCHITECTURE.md |
| 10 | Deployment & Infrastructure | Dev/staging/production setup | SYSTEM_ARCHITECTURE.md |
| 11 | State Management & Data Flow | React state & data synchronization | SYSTEM_ARCHITECTURE.md |
| 12 | Error Handling & Recovery | Error classification & responses | SYSTEM_ARCHITECTURE.md |
| 13 | Module & Component Hierarchy | Next.js app structure | TECHNICAL_ARCHITECTURE.md |
| 14 | Component Tree - Doctor Portal | React component organization | TECHNICAL_ARCHITECTURE.md |
| 15 | Component Tree - Patient Portal | React component organization | TECHNICAL_ARCHITECTURE.md |
| 16 | Prisma ORM Operations | Database operation patterns | TECHNICAL_ARCHITECTURE.md |
| 17 | NextAuth Authentication Flow | Detailed auth sequence | TECHNICAL_ARCHITECTURE.md |
| 18 | MQTT Real-time Communication | Message broker details | TECHNICAL_ARCHITECTURE.md |
| 19 | Data Persistence Flow | Database write operations | TECHNICAL_ARCHITECTURE.md |
| 20 | AI Analysis Pipeline | ML classification process | TECHNICAL_ARCHITECTURE.md |
| 21 | Image Upload & Storage | File handling flow | TECHNICAL_ARCHITECTURE.md |
| 22 | Security Layers | Defense-in-depth approach | TECHNICAL_ARCHITECTURE.md |
| 23 | Error Handling Hierarchy | Error classification system | TECHNICAL_ARCHITECTURE.md |
| 24 | Deployment & CI/CD Pipeline | Automated deployment process | TECHNICAL_ARCHITECTURE.md |
| 25 | Monitoring & Observability | Logging, metrics, alerts | TECHNICAL_ARCHITECTURE.md |
| 26 | Backup & Disaster Recovery | Data protection strategy | TECHNICAL_ARCHITECTURE.md |

---

## 🔑 Key Components

### Hardware
- **IoT Device**: Arduino-based sensor measuring:
  - Jaw flexion angle (degrees)
  - Acoustic signals (audio waveform)
  - Transmits over WiFi to MQTT broker

### Backend Services
- **Next.js Server**
  - API routes for CRUD operations
  - Real-time data processing
  - Session management (NextAuth)
  - File upload handling
  - AI analysis processing

### Frontend
- **Doctor Portal** (`/doctor/*`)
  - Patient management & access codes
  - Live monitoring (real-time charts)
  - Session history & analysis
  - Patient notes & TMJ images
  
- **Patient Portal** (`/patient/*`)
  - Login with Patient ID + code
  - View measurement history
  - Download/export sessions
  - Contact doctor

### Database Models
```
Doctor
  ├─ username (unique)
  ├─ password (hashed)
  ├─ name
  └─ patients []

Patient
  ├─ id (custom)
  ├─ name, age, gender
  ├─ accessCode
  ├─ doctor (FK)
  └─ sessions []

Session
  ├─ patientId (FK)
  ├─ sensorData (JSON)
  ├─ duration
  ├─ aiStatus (0-3: Normal, Arthritis, Degeneration, Severe)
  ├─ doctorNotes
  └─ images (front, right, left)

HospitalAccount
  ├─ email (unique)
  ├─ password (hashed)
  └─ doctors []
```

### Real-time Communication
- **MQTT Broker** (mosquitto)
- **Topics**:
  - `sensor/angle` → Flexion angle data
  - `sensor/audio` → Acoustic signal data
- **Transport**: WebSocket Secure (WSS) on port 8883

### AI Classification
- Input: Sensor data (angle + audio)
- Processing: Feature extraction + neural network
- Output: 4-class classification
  - `0`: Normal
  - `1`: Arthritis
  - `2`: Degeneration
  - `3`: Severe (Tiếng rắc)

---

## 🔐 Security Architecture

**Authentication** (NextAuth.js)
- Doctor: Username + Password
- Patient: Patient ID + Access Code
- Hospital Admin: Email + Password

**Authorization** (Role-based)
- Doctors can only see own patients
- Patients can only see own sessions
- Middleware enforces `/doctor/*` protection

**Data Protection**
- HTTPS only (Cloudflare Tunnel)
- Password hashing (bcrypt)
- JWT tokens for sessions
- SQL injection prevention (Prisma)
- CSRF protection (NextAuth)

---

## 🚀 Development Workflow

### Local Development
1. Clone repo
2. Install dependencies: `npm install`
3. Set environment variables in `.env`
4. Initialize database: `npx prisma db push`
5. Start dev server: `npm run dev`
6. (Optional) Start Prisma Studio: `npx prisma studio`

### Testing with Real Device
1. Deploy web app (or use Cloudflare Tunnel)
2. Update IoT device with MQTT broker URL
3. Device publishes sensor data
4. Doctor logs in and starts monitoring
5. Real-time charts update as data arrives

### Remote Access
Use Cloudflare Tunnel for mobile testing:
```bash
npx untun tunnel http://localhost:3000
# Copy URL and update NEXTAUTH_URL in .env
```

### Deployment
- **Frontend**: Vercel (optimized for Next.js)
- **Database**: PostgreSQL (AWS RDS / Supabase)
- **MQTT Broker**: Self-hosted or managed (HiveMQ)
- **Static Files**: AWS S3 or local `/public`

---

## 📈 Data Flow Summary

### Session Workflow
```
1. Doctor creates patient → Generate access code
2. Patient logs in → View history
3. Doctor starts session → MQTT subscription
4. IoT publishes data → MQTT broker
5. Data → Browser & backend
6. Browser displays charts → Real-time updates
7. Backend processes data → Store + AI analysis
8. Doctor stops session → Session saved to DB
9. Doctor adds notes/images → Session complete
10. Patient views → Session in history
```

### AI Analysis Workflow
```
1. Sensor data received → Preprocess
2. Feature extraction → Audio + angle metrics
3. ML model inference → Probability scores
4. Max probability > threshold → Classify
5. Store result in session.aiStatus (0-3)
6. Display in UI with confidence
```

---

## 🔍 Key Files to Know

| Path | Purpose |
|------|---------|
| `joint-monitor-web/app/` | All UI pages & routes |
| `joint-monitor-web/app/api/` | Backend API routes |
| `joint-monitor-web/prisma/schema.prisma` | Database schema |
| `joint-monitor-web/middleware.ts` | Route protection |
| `TMJ-monitor/TMJ-monitor.ino` | IoT device code |
| `.env` | Environment configuration (NOT in git) |

---

## ⚙️ Environment Setup Checklist

- [ ] Node.js (v18+) installed
- [ ] PostgreSQL server running (local or cloud)
- [ ] Database created & connection URL noted
- [ ] `.env` file created with:
  - [ ] `DATABASE_URL` 
  - [ ] `DIRECT_URL`
  - [ ] `NEXTAUTH_URL`
  - [ ] `NEXTAUTH_SECRET`
- [ ] `npx prisma generate` executed
- [ ] `npx prisma db push` executed
- [ ] Development server started: `npm run dev`
- [ ] App accessible at http://localhost:3000

---

## 🐛 Common Issues & Solutions

### Database Connection Failed
```
Error: connect ECONNREFUSED
→ Check PostgreSQL is running
→ Verify DATABASE_URL is correct
→ Check port (default 5432)
```

### MQTT Connection Failed
```
Error: Connection refused
→ Check MQTT broker is running
→ Verify WSS endpoint & port
→ Check firewall rules
```

### NextAuth Session Issues
```
Error: [next-auth] Callback must be an async function
→ Ensure NEXTAUTH_URL matches browser URL
→ Verify NEXTAUTH_SECRET is set & not empty
→ Check auth route setup in [...nextauth].ts
```

### Prisma Migration Issues
```
Error: Database sync failed
→ Run: npx prisma db push --force-reset (DEV ONLY)
→ Check schema syntax
→ Verify database permissions
```

---

## 📞 Support & Contact

- **Developer**: MiceBach
- **Project**: BMEIC Medical Project
- **Stack**: Next.js + React + Prisma + PostgreSQL + MQTT

---

## 🗺️ Architecture Document Map

```
TMJ_Diagnosis_System/
├── README.md                        # Project overview
├── SYSTEM_ARCHITECTURE.md           # Diagrams 1-12 (HIGH LEVEL)
├── TECHNICAL_ARCHITECTURE.md        # Diagrams 13-26 (IMPLEMENTATION)
├── QUICK_REFERENCE.md              # This file
├── joint-monitor-web/
│   ├── app/                        # Next.js app directory
│   ├── prisma/
│   │   └── schema.prisma           # Database schema
│   ├── .env                        # Local config (not in git)
│   └── ...
├── TMJ-monitor/
│   └── TMJ-monitor.ino            # IoT firmware
└── ...
```

Start with **SYSTEM_ARCHITECTURE.md** to understand the big picture, then refer to **TECHNICAL_ARCHITECTURE.md** for implementation details!

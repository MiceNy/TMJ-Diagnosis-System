# TMJ Diagnosis / Joint Monitor System - Architecture Documentation

## 1. SYSTEM ARCHITECTURE BLOCK DIAGRAM

```mermaid
graph TB
    subgraph Hardware["🔧 Hardware Layer"]
        IoT["TMJ Monitor Device<br/>(Arduino-based)<br/>- Flexion Angle Sensor<br/>- Audio Sensor<br/>- Wireless Module"]
    end

    subgraph Network["🌐 Network Layer"]
        MQTT["MQTT Broker<br/>(WebSocket SSL)"]
        Cloudflare["Cloudflare Tunnel<br/>(Optional Remote Access)"]
    end

    subgraph Backend["⚙️ Backend Services"]
        NextServer["Next.js Server<br/>- API Routes<br/>- Authentication<br/>- Data Processing"]
        Middleware["Middleware<br/>- Auth Protection<br/>- Request Handling"]
    end

    subgraph Database["💾 Database Layer"]
        PG["PostgreSQL<br/>- Doctors<br/>- Patients<br/>- Sessions<br/>- Hospital Accounts"]
        Prisma["Prisma ORM<br/>- Schema Management<br/>- Migrations"]
    end

    subgraph Frontend["🖥️ Frontend Layer"]
        Web["Next.js Web App<br/>- React Components<br/>- Tailwind CSS<br/>- shadcn/ui"]
    end

    subgraph ClientApps["📱 Client Applications"]
        Doctor["Doctor Portal<br/>- Patient Management<br/>- Live Monitoring<br/>- Session History"]
        Patient["Patient Portal<br/>- Login/View Sessions<br/>- Measurement History"]
    end

    subgraph Libraries["📦 Libraries"]
        TF["TensorFlow.js<br/>(Optional)"]
        Recharts["Recharts<br/>(Charts)"]
        NextAuth["NextAuth<br/>(Authentication)"]
    end

    IoT -->|Transmits Data| MQTT
    MQTT -->|Receives Data| NextServer
    NextServer -->|Process & Store| PG
    Prisma -->|Manages Schema| PG
    NextServer -->|API Routes| Web
    Web -->|Renders UI| Doctor
    Web -->|Renders UI| Patient
    NextServer -->|Auth Check| Middleware
    Cloudflare -->|Tunnels Traffic| NextServer
    Web -->|Uses| Recharts
    Web -->|Uses| NextAuth
    Doctor -->|Monitors| MQTT
    Patient -->|Views Data| NextServer
```

---

## 2. DATA FLOW DIAGRAM

```mermaid
graph LR
    A["IoT Device<br/>Sensors"] -->|Raw Data<br/>Angle + Audio| B["MQTT Broker<br/>(WebSocket)"]
    
    B -->|Subscribes| C["Real-time Handler<br/>Web Client"]
    B -->|Subscribes| D["Backend Listener<br/>API Route"]
    
    C -->|Display| E["Live Chart<br/>Doctor Monitor"]
    
    D -->|Store Session Data| F["PostgreSQL<br/>Sessions Table"]
    D -->|Process & Analyze| G["AI Analysis<br/>Normal/Arthritis/<br/>Degeneration/Severe"]
    
    G -->|Write Results| F
    F -->|Query| H["Doctor Portal<br/>View History"]
    F -->|Query| I["Patient Portal<br/>View Sessions"]
    
    H -->|Generate| J["Reports & Notes"]
    I -->|Display| K["Patient Measurements"]
```

---

## 3. USER AUTHENTICATION FLOW

```mermaid
flowchart TD
    A["User Visits App<br/>localhost:3000"] --> B{User Type?}
    
    B -->|Doctor| C["Doctor Login<br/>Username + Password"]
    B -->|Patient| D["Patient Login<br/>Patient ID + Access Code"]
    B -->|Hospital Admin| E["Hospital Admin Login<br/>Email + Password"]
    
    C --> F["NextAuth Verify<br/>Doctor Credentials"]
    D --> G["NextAuth Verify<br/>Patient Credentials"]
    E --> H["NextAuth Verify<br/>Hospital Credentials"]
    
    F -->|✓ Valid| I["Create Session<br/>JWT Token"]
    G -->|✓ Valid| I
    H -->|✓ Valid| I
    
    F -->|✗ Invalid| J["Redirect to Login<br/>Show Error"]
    G -->|✗ Invalid| J
    H -->|✗ Invalid| J
    
    I --> K["Set Auth Cookie"]
    K --> L{Middleware Check}
    
    L -->|Accessing /doctor/*| M["Verify Doctor Role"]
    L -->|Accessing /patient/*| N["Verify Patient Role"]
    L -->|Other Routes| O["Allow Access"]
    
    M -->|✓ Authorized| P["Load Doctor Portal"]
    N -->|✓ Authorized| Q["Load Patient Portal"]
    O --> R["Load Public Pages"]
    
    M -->|✗ Unauthorized| S["Redirect to Login"]
    N -->|✗ Unauthorized| S
```

---

## 4. DOCTOR WORKFLOW FLOWCHART

```mermaid
flowchart TD
    A["Doctor Login<br/>Dashboard"] --> B["Patient Management"]
    
    B --> C{Action?}
    
    C -->|Create Patient| D["Generate Access Code<br/>with Patient ID"]
    C -->|View Patient List| E["Display All Patients<br/>Managed by Doctor"]
    C -->|Select Patient| F["Patient Details<br/>Age, Gender, History"]
    
    D --> G["Send Code to Patient"]
    G --> H["Patient Activates Account"]
    
    F --> I["Start Live Monitoring"]
    
    I --> J["MQTT Subscribe<br/>Real-time Data"]
    J --> K["Display Live Charts<br/>Angle + Audio Signals"]
    J --> L["Audio Waveform<br/>Visualization"]
    
    K --> M{Monitoring Complete?}
    L --> M
    
    M -->|Continue| K
    M -->|Stop| N["End Session"]
    
    N --> O["Save Session Data<br/>- Duration<br/>- Sensor Data<br/>- AI Analysis"]
    
    O --> P["AI Analysis Results<br/>- Normal: 0<br/>- Arthritis: 1<br/>- Degeneration: 2<br/>- Severe: 3"]
    
    P --> Q["Add Doctor Notes<br/>Optional TMJ Images<br/>- Front<br/>- Right Side<br/>- Left Side"]
    
    Q --> R["Store in Database"]
    R --> S["View Session History<br/>Previous Sessions List"]
```

---

## 5. PATIENT WORKFLOW FLOWCHART

```mermaid
flowchart TD
    A["Patient Receives<br/>Access Code"] --> B["Visit Web Application"]
    
    B --> C["Patient Login Page"]
    C --> D["Enter Patient ID"]
    D --> E["Enter Access Code"]
    
    E --> F["NextAuth Validation"]
    F -->|✓ Valid| G["Access Patient Portal"]
    F -->|✗ Invalid| H["Error Message<br/>Try Again"]
    
    H --> C
    
    G --> I["Dashboard<br/>Session History"]
    I --> J["View All Sessions<br/>- Date<br/>- Duration<br/>- Doctor Notes"]
    
    J --> K["Select Session"]
    K --> L["Session Details<br/>- Charts<br/>- AI Results<br/>- Doctor Comments<br/>- TMJ Images"]
    
    L --> M["View Charts<br/>Angle Progression<br/>Audio Analysis"]
    
    M --> N{Patient Action?}
    N -->|View Another| J
    N -->|Logout| O["End Session"]
```

---

## 6. DATABASE SCHEMA DIAGRAM

```mermaid
erDiagram
    DOCTOR ||--o{ PATIENT : manages
    DOCTOR ||--o{ HOSPITALACC : "belongs to"
    PATIENT ||--o{ SESSION : has
    
    DOCTOR {
        string id PK
        string username UK
        string password
        string name
        string hospitalId FK
    }
    
    PATIENT {
        string id PK
        string name
        int age
        string gender
        string accessCode
        string doctorId FK
    }
    
    SESSION {
        string id PK
        string patientId FK
        string sensorData
        int aiStatus
        int duration
        datetime startTime
        string doctorNotes
        int aiNormal
        int aiArthritis
        int aiDegeneration
        int aiSevere
        string imageFront
        string imageRight
        string imageLeft
    }
    
    HOSPITALACC {
        string id PK
        string email UK
        string password
        string name
    }
```

---

## 7. API ENDPOINT ARCHITECTURE

```mermaid
graph TB
    subgraph Auth["🔐 Auth APIs"]
        A1["/api/auth/[...nextauth]<br/>Login/Logout/Session"]
    end
    
    subgraph Doctor["👨‍⚕️ Doctor APIs"]
        D1["/api/doctor/patients<br/>List/Create Patients"]
        D2["/api/doctor/sessions<br/>Get/Create Sessions"]
        D3["/api/doctor/access-code<br/>Generate Codes"]
    end
    
    subgraph Patient["👤 Patient APIs"]
        P1["/api/patient/sessions<br/>Get Session History"]
        P2["/api/patient/profile<br/>Get Patient Info"]
    end
    
    subgraph Realtime["⚡ Real-time"]
        R1["MQTT Topics<br/>sensor/data<br/>sensor/audio"]
    end
    
    subgraph Utility["🔧 Utility"]
        U1["/api/upload<br/>Image Upload"]
        U2["/api/ai-analysis<br/>Process Results"]
    end
    
    Auth -->|JWT Token| Doctor
    Auth -->|JWT Token| Patient
    Doctor --> Realtime
    Patient --> Utility
```

---

## 8. REAL-TIME DATA FLOW WITH MQTT

```mermaid
sequenceDiagram
    participant IoT as IoT Device
    participant MQTT as MQTT Broker
    participant Backend as Next.js Backend
    participant DB as PostgreSQL
    participant Frontend as Browser/UI
    
    IoT->>MQTT: Publish sensor/data<br/>{angle: 45.2}
    IoT->>MQTT: Publish sensor/audio<br/>{frequency, amplitude}
    
    MQTT->>Backend: Subscribe to topics
    MQTT->>Frontend: WebSocket connection
    
    Backend->>Backend: Process incoming data
    Backend->>DB: Store in session_data
    
    Frontend->>MQTT: Listen to updates
    MQTT->>Frontend: Real-time updates
    Frontend->>Frontend: Update Charts<br/>Angle + Audio graphs
    
    DB->>Backend: Query historical data
    Backend->>Frontend: API response
    Frontend->>Frontend: Render history view
```

---

## 9. COMPLETE SYSTEM INTERACTION FLOW

```mermaid
graph TB
    subgraph Setup["1️⃣ SETUP PHASE"]
        S1["Doctor Creates Account"]
        S2["Doctor Generates Patient Code"]
        S3["Patient Receives Code"]
        S1 --> S2 --> S3
    end
    
    subgraph Auth["2️⃣ AUTHENTICATION PHASE"]
        A1["Doctor Logs In"]
        A2["Patient Logs In"]
        A1 --> Auth_DB["Auth DB Check"]
        A2 --> Auth_DB
        Auth_DB --> Auth_Token["Issue JWT Token"]
    end
    
    subgraph Monitor["3️⃣ MONITORING PHASE"]
        M1["Doctor: Start Live Session"]
        M2["Subscribe MQTT Topics"]
        M3["IoT Device Transmits Data"]
        M1 --> M2 --> M3
        M3 --> M4["Receive in Real-time"]
        M4 --> M5["Update UI Charts"]
    end
    
    subgraph Process["4️⃣ PROCESSING PHASE"]
        P1["AI Analysis Engine"]
        P2["Classify Condition"]
        P3["Generate Results"]
        P1 --> P2 --> P3
    end
    
    subgraph Save["5️⃣ SAVE PHASE"]
        Sv1["Save Session Data"]
        Sv2["Save AI Results"]
        Sv3["Save Images"]
        Sv4["Add Doctor Notes"]
        Sv1 --> Sv2 --> Sv3 --> Sv4
        Sv4 --> DB_Save["Store in PostgreSQL"]
    end
    
    subgraph Review["6️⃣ REVIEW PHASE"]
        R1["Patient Views History"]
        R2["Doctor Reviews Sessions"]
        R3["Compare Results Over Time"]
        R1 --> Query_DB["Query Database"]
        R2 --> Query_DB
        Query_DB --> Display["Display Analytics"]
    end
    
    Setup --> Auth
    Auth --> Monitor
    Monitor --> Process
    Process --> Save
    Save --> Review
```

---

## 10. DEPLOYMENT & INFRASTRUCTURE

```mermaid
graph TB
    subgraph Local["Local Development"]
        Dev["Next.js Dev Server<br/>localhost:3000"]
        LocalDB["PostgreSQL Local<br/>localhost:5432"]
    end
    
    subgraph Tunnel["Remote Access"]
        CF["Cloudflare Tunnel<br/>https://*.trycloudflare.com"]
    end
    
    subgraph Production["Production"]
        ProdServer["Deployed Server<br/>(Vercel/Custom)"]
        ProdDB["PostgreSQL Cloud<br/>(Managed)"]
    end
    
    subgraph Hardware["Hardware"]
        IoT["IoT Device<br/>(WiFi/Cellular)"]
    end
    
    Dev -.->|Testing| LocalDB
    Dev -->|Enable for Testing| CF
    CF -->|Routes Traffic| IoT
    
    ProdServer -->|Writes to| ProdDB
    IoT -->|Transmits Data| CF
    CF -->|Routes to| ProdServer
    
    style Local fill:#e1f5ff
    style Tunnel fill:#fff3e0
    style Production fill:#c8e6c9
    style Hardware fill:#f3e5f5
```

---

## 11. STATE MANAGEMENT & DATA FLOW

```mermaid
graph LR
    subgraph Client["Client State"]
        CState["React State<br/>- Current Session<br/>- Live Data<br/>- UI Settings"]
    end
    
    subgraph Session["Server Session"]
        SState["NextAuth Session<br/>- User ID<br/>- Role<br/>- Token"]
    end
    
    subgraph Database["Persistent State"]
        DState["PostgreSQL<br/>- Doctors<br/>- Patients<br/>- Sessions<br/>- Hospital"]
    end
    
    subgraph RealTime["Real-time State"]
        RState["MQTT Messages<br/>- Live Sensor Data<br/>- Audio Signals"]
    end
    
    CState -->|Syncs with| SState
    SState -->|Authenticates| DState
    RState -->|Updates| CState
    DState -->|Queries| CState
    RState -->|Persists to| DState
```

---

## 12. ERROR HANDLING & RECOVERY

```mermaid
flowchart TD
    A["Operation Starts"] --> B{Error Occurs?}
    
    B -->|No| C["Complete Successfully"]
    B -->|Yes| D{Error Type?}
    
    D -->|Auth Error| E["Redirect to Login"]
    D -->|Network Error| F["Retry Connection"]
    D -->|DB Error| G["Log Error<br/>Notify User"]
    D -->|MQTT Disconnect| H["Attempt Reconnect<br/>Show Offline Status"]
    D -->|Validation Error| I["Return Error Message<br/>Show Form Hints"]
    
    E --> J["User Logs In"]
    F --> K{Successful?}
    H --> L{Reconnected?}
    
    K -->|Yes| C
    K -->|No| M["Show Error Message<br/>Log for Support"]
    L -->|Yes| N["Resume Monitoring"]
    L -->|No| M
```

---

## Summary

This TMJ Diagnosis System consists of:

1. **Hardware**: Arduino-based IoT device measuring jaw flexion angle & audio signals
2. **Network**: MQTT over WebSocket for real-time data transmission
3. **Backend**: Next.js with API routes for business logic
4. **Database**: PostgreSQL storing doctors, patients, sessions, and AI analysis results
5. **Frontend**: React components with real-time chart visualization
6. **Authentication**: NextAuth with role-based access control
7. **Analytics**: AI classification of TMJ conditions (Normal/Arthritis/Degeneration/Severe)
8. **Portals**: Separate Doctor and Patient interfaces with different permissions

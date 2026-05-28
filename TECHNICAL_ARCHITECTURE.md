# TMJ System - Detailed Technical Architecture

## 13. MODULE & COMPONENT HIERARCHY

```mermaid
graph TB
    subgraph App["📱 Next.js App Directory"]
        Layout["layout.tsx<br/>Root Layout"]
        Global["globals.css<br/>Styling"]
        
        subgraph Routes["Routes"]
            Root["page.tsx<br/>Home Page"]
            Login["login/<br/>Doctor/Hospital Login"]
            PatientLogin["patient-login/<br/>Patient Login"]
            
            subgraph Doctor["doctor/"]
                DocDash["dashboard/<br/>Patient List"]
                DocPatient["patient/[id]/<br/>Patient Details"]
                DocMonitor["monitor/<br/>Live Session"]
                DocHistory["sessions/<br/>Session History"]
            end
            
            subgraph Patient["patient/"]
                PatDash["dashboard/<br/>Session List"]
                PatSession["[sessionId]/<br/>View Session Details"]
            end
        end
        
        subgraph API["api/"]
            Auth["auth/[...nextauth]<br/>Authentication"]
            DoctorAPI["doctor/<br/>CRUD Operations"]
            PatientAPI["patient/<br/>Data Queries"]
            UtilAPI["utility/<br/>Upload, AI"]
        end
    end
    
    Layout --> Global
    Layout --> Routes
    Routes --> Login
    Routes --> PatientLogin
    Routes --> Root
    Routes --> Doctor
    Routes --> Patient
    Routes --> API
```

---

## 14. COMPONENT TREE - DOCTOR PORTAL

```mermaid
graph TB
    DoctorApp["DoctorLayout"]
    
    DoctorApp --> Sidebar["Sidebar<br/>- Navigation<br/>- User Menu<br/>- Logout"]
    DoctorApp --> Main["Main Content<br/>Route-based"]
    
    Main --> Dashboard["Patient Management"]
    Main --> Live["Live Monitor"]
    Main --> History["Session History"]
    
    Dashboard --> PatList["PatientList<br/>Table Component"]
    Dashboard --> CreateBtn["CreatePatient<br/>Dialog"]
    
    PatList --> PatCard["PatientCard<br/>- Name<br/>- Age<br/>- Last Session"]
    PatList --> AccessCode["AccessCode<br/>Display & Copy"]
    
    Live --> Chart1["AngleChart<br/>Recharts<br/>Real-time"]
    Live --> Chart2["AudioChart<br/>Waveform<br/>Frequency"]
    Live --> Controls["Controls<br/>- Start/Stop<br/>- AI Results<br/>- Notes"]
    
    History --> SessionList["SessionTable<br/>Paginated"]
    SessionList --> SessionRow["SessionRow<br/>Expandable Details"]
    SessionRow --> Details["SessionDetails<br/>- AI Classification<br/>- Images<br/>- Doctor Notes"]
```

---

## 15. COMPONENT TREE - PATIENT PORTAL

```mermaid
graph TB
    PatientApp["PatientLayout"]
    
    PatientApp --> Header["Header<br/>- Patient Name<br/>- Logout Button"]
    PatientApp --> Content["Main Content"]
    
    Content --> Dashboard["Session Dashboard"]
    Content --> SessionView["Session Viewer"]
    
    Dashboard --> List["SessionList<br/>Timeline/Table"]
    List --> Item["SessionCard<br/>- Date<br/>- Duration<br/>- Status"]
    Item --> Click["Click → Open"]
    
    SessionView --> Info["Session Info<br/>- Duration<br/>- Doctor Notes<br/>- Diagnosis"]
    SessionView --> Charts["Charts<br/>- Angle Progress<br/>- Audio Analysis"]
    SessionView --> Images["TMJ Images<br/>- Front<br/>- Right<br/>- Left"]
    SessionView --> Back["Back Button"]
```

---

## 16. PRISMA ORM OPERATIONS

```mermaid
graph TB
    Client["Prisma Client<br/>@prisma/client"]
    
    Client --> Doctor_Ops["Doctor Operations"]
    Client --> Patient_Ops["Patient Operations"]
    Client --> Session_Ops["Session Operations"]
    Client --> Hospital_Ops["Hospital Operations"]
    
    Doctor_Ops --> D_Create["create()<br/>Register doctor"]
    Doctor_Ops --> D_Find["findUnique()<br/>Login verification"]
    Doctor_Ops --> D_Update["update()<br/>Profile changes"]
    
    Patient_Ops --> P_Create["create()<br/>Add patient"]
    Patient_Ops --> P_Find["findMany()<br/>List patients"]
    Patient_Ops --> P_Relation["Include doctor<br/>Get related data"]
    
    Session_Ops --> S_Create["create()<br/>Save session"]
    Session_Ops --> S_Find["findMany()<br/>Get history"]
    Session_Ops --> S_Update["update()<br/>Add notes/images"]
    
    Hospital_Ops --> H_Create["create()<br/>Register hospital"]
    Hospital_Ops --> H_Find["findUnique()<br/>Admin login"]
```

---

## 17. NEXTAUTH AUTHENTICATION FLOW

```mermaid
sequenceDiagram
    participant User
    participant Browser
    participant NextAuth as NextAuth.js
    participant Database
    participant JWT as JWT Engine
    
    User->>Browser: Visit /doctor/dashboard
    Browser->>NextAuth: No auth cookie
    NextAuth->>Browser: Redirect to /login
    
    User->>Browser: Enter credentials
    Browser->>NextAuth: POST /api/auth/callback/credentials
    
    NextAuth->>Database: Query doctor by username
    Database->>NextAuth: Return doctor record
    
    NextAuth->>NextAuth: Verify password hash
    
    alt Password Correct
        NextAuth->>JWT: Create JWT token
        JWT->>NextAuth: Return token
        NextAuth->>Browser: Set auth cookie
        Browser->>Browser: Redirect to /doctor/dashboard
    else Password Incorrect
        NextAuth->>Browser: Return error
        Browser->>User: Show "Invalid credentials"
    end
    
    User->>Browser: Make authenticated request
    Browser->>NextAuth: Send cookie with request
    NextAuth->>NextAuth: Verify token & session
    NextAuth->>Browser: ✓ Proceed with request
```

---

## 18. MQTT REAL-TIME COMMUNICATION

```mermaid
graph LR
    IoT["IoT Device<br/>Publisher"] -->|Connect| Broker["MQTT Broker<br/>mosquitto<br/>Port 8883 WSS"]
    
    Broker -->|Subscribe| WebClient["Web Browser<br/>JavaScript Client"]
    Broker -->|Subscribe| Backend["Next.js Backend<br/>API Route"]
    
    IoT -->|Publish| T1["sensor/angle<br/>{'degrees': 45.2}"]
    IoT -->|Publish| T2["sensor/audio<br/>{'freq': [...]<br/>'amp': [...]}"]
    
    T1 --> Broker
    T2 --> Broker
    
    Broker -->|Message| WebClient
    Broker -->|Message| Backend
    
    WebClient -->|Process| UI["Update Charts<br/>Real-time Graph"]
    Backend -->|Store| DB["PostgreSQL<br/>Session Data"]
    
    WebClient -->|User Action| WebClient
```

---

## 19. DATA PERSISTENCE FLOW

```mermaid
graph TB
    Session["Session Object<br/>- patientId<br/>- sensorData<br/>- aiStatus<br/>- duration"]
    
    Session --> Validate["Validation<br/>- Check required fields<br/>- Verify patient exists<br/>- Check doctor access"]
    
    Validate -->|Valid| Transform["Transform Data<br/>- Stringify arrays<br/>- Format timestamps<br/>- Classify AI status"]
    
    Transform --> Encrypt["Secure<br/>- Hash sensitive data<br/>- Prepare for storage"]
    
    Encrypt --> Prisma["Prisma ORM<br/>session.create()"]
    
    Prisma --> SQL["Generate SQL<br/>INSERT INTO sessions..."]
    
    SQL --> DB["PostgreSQL<br/>Write to Disk<br/>Create Indexes"]
    
    DB --> Confirm["Confirmation<br/>Return sessionId<br/>Success response"]
```

---

## 20. AI ANALYSIS PIPELINE

```mermaid
flowchart TD
    Input["Raw Sensor Data<br/>Angle + Audio"]
    
    Input --> Preprocess["Preprocessing<br/>- Normalize values<br/>- Remove noise<br/>- Segment signals"]
    
    Preprocess --> Feature["Feature Extraction<br/>- Angle statistics<br/>- Frequency spectrum<br/>- Acoustic patterns<br/>- Duration metrics"]
    
    Feature --> Model["ML Model<br/>- Neural Network<br/>- Classification Head<br/>- Softmax Output"]
    
    Model --> Results["Classification<br/>Score: [p0, p1, p2, p3]"]
    
    Results --> Decision["Decision Logic"]
    
    Decision -->|Max > 0.7| Classify["Classify as<br/>Label with Confidence"]
    Decision -->|Max ≤ 0.7| Uncertain["Mark as Uncertain<br/>Require Manual Review"]
    
    Classify --> Output1["0: Normal<br/>1: Arthritis<br/>2: Degeneration<br/>3: Severe"]
    Uncertain --> Output2["Flag for Doctor<br/>Review"]
    
    Output1 --> Save["Store in Database<br/>aiStatus field"]
    Output2 --> Save
```

---

## 21. IMAGE UPLOAD & STORAGE

```mermaid
graph TB
    Patient["Patient/Doctor"]
    Patient -->|Upload| Form["Form Input<br/>- imageFront<br/>- imageRight<br/>- imageLeft"]
    
    Form -->|Select Files| Validate["File Validation<br/>- Check MIME type<br/>- Check file size<br/>- Verify extensions"]
    
    Validate -->|Valid| Upload["Upload API<br/>/api/upload"]
    Validate -->|Invalid| Error["Error Message<br/>Show constraints"]
    
    Upload --> Process["Process Image<br/>- Compress<br/>- Generate thumbnails<br/>- Create unique filename"]
    
    Process --> Store["Store Location<br/>Local /public/images<br/>OR Cloud Storage<br/>AWS S3/Cloudinary"]
    
    Store --> URL["Generate URL<br/>https://app/images/..."]
    
    URL --> Database["Save URL to<br/>Session Model<br/>- imageFront<br/>- imageRight<br/>- imageLeft"]
    
    Database --> Display["Display in<br/>Session View"]
```

---

## 22. SECURITY LAYERS

```mermaid
graph TB
    Request["Incoming Request"]
    
    Request --> Middleware["Middleware Layer"]
    Middleware --> Session["1. Check Session<br/>Verify JWT Token"]
    
    Session -->|Invalid| Reject1["Reject: 401<br/>Redirect to Login"]
    Session -->|Valid| Role["2. Check Role<br/>Doctor/Patient/Admin"]
    
    Role -->|Unauthorized| Reject2["Reject: 403<br/>Forbidden"]
    Role -->|Authorized| Route["3. Route Guard<br/>Verify path access"]
    
    Route -->|Denied| Reject3["Reject: 403<br/>Forbidden"]
    Route -->|Allowed| API["4. API Security<br/>- Input validation<br/>- SQL injection prevention<br/>- XSS protection"]
    
    API -->|Invalid| Reject4["Reject: 400<br/>Bad Request"]
    API -->|Valid| Business["5. Business Logic<br/>- Doctor owns patient<br/>- Patient owns session<br/>- Data ownership check"]
    
    Business -->|Unauthorized| Reject5["Reject: 403<br/>Access Denied"]
    Business -->|Authorized| Process["✓ Process Request"]
    
    Reject1 --> Response["400/401/403/500"]
    Reject2 --> Response
    Reject3 --> Response
    Reject4 --> Response
    Reject5 --> Response
    Process --> Success["200 Success<br/>Response Data"]
```

---

## 23. ERROR HANDLING HIERARCHY

```mermaid
graph TB
    Error["Error Occurs"]
    
    Error --> Type{Error Type}
    
    Type -->|Validation| V["Invalid Input<br/>- Missing fields<br/>- Wrong type<br/>- Out of range"]
    Type -->|Authentication| A["Auth Failed<br/>- Invalid credentials<br/>- Expired token<br/>- No session"]
    Type -->|Authorization| Az["Access Denied<br/>- Insufficient role<br/>- Data ownership<br/>- Route guard"]
    Type -->|Database| DB["DB Error<br/>- Connection failed<br/>- Query error<br/>- Constraint violation"]
    Type -->|External Service| ES["Service Error<br/>- MQTT timeout<br/>- Upload failed<br/>- Email service"]
    Type -->|Runtime| RT["Code Error<br/>- Null reference<br/>- Type mismatch<br/>- Logic error"]
    
    V --> V_Handle["Handle: Return 400<br/>Show field errors<br/>Suggest fixes"]
    A --> A_Handle["Handle: Return 401<br/>Clear session<br/>Redirect to login"]
    Az --> Az_Handle["Handle: Return 403<br/>Log attempt<br/>Notify admin"]
    DB --> DB_Handle["Handle: Return 500<br/>Log error<br/>Retry logic"]
    ES --> ES_Handle["Handle: Return 503<br/>Queue retry<br/>Notify user"]
    RT --> RT_Handle["Handle: Return 500<br/>Log stacktrace<br/>Alert on-call"]
    
    V_Handle --> Response["API Response<br/>Status + Message"]
    A_Handle --> Response
    Az_Handle --> Response
    DB_Handle --> Response
    ES_Handle --> Response
    RT_Handle --> Response
```

---

## 24. DEPLOYMENT & CI/CD PIPELINE

```mermaid
graph LR
    Dev["👨‍💻 Developer<br/>Local Machine"]
    Dev -->|git push| Repo["GitHub<br/>Repository"]
    
    Repo -->|webhook| CI["CI Pipeline<br/>GitHub Actions"]
    
    CI --> Lint["Run Linter<br/>ESLint/Prettier"]
    CI --> Build["Build Check<br/>npm run build"]
    CI --> Type["Type Check<br/>TypeScript"]
    
    Lint -->|Pass| Deploy_Staging["Deploy to Staging"]
    Build -->|Pass| Deploy_Staging
    Type -->|Pass| Deploy_Staging
    
    Deploy_Staging -->|Tests OK| Notify1["Notify Developer<br/>Ready to promote"]
    Deploy_Staging -->|Tests Fail| Notify2["Notify Developer<br/>Build failed"]
    
    Notify1 --> Promote["Manual Approval"]
    Promote -->|Approved| Deploy_Prod["Deploy to Production<br/>Vercel/Server"]
    
    Deploy_Prod --> Health["Health Check<br/>- API endpoints<br/>- Database connection<br/>- MQTT broker"]
    Health -->|OK| Success["✓ Deployment Success<br/>Notify team"]
    Health -->|Failed| Rollback["⚠ Rollback<br/>Previous version"]
```

---

## 25. MONITORING & OBSERVABILITY

```mermaid
graph TB
    App["Application"]
    
    App --> Metrics["📊 Metrics<br/>- Request count<br/>- Response time<br/>- Error rate<br/>- DB query time"]
    
    App --> Logs["📝 Logs<br/>- API calls<br/>- Errors<br/>- Auth events<br/>- Data changes"]
    
    App --> Traces["🔍 Traces<br/>- Request flow<br/>- API dependencies<br/>- Timing breakdown"]
    
    Metrics -->|Aggregated| Dashboard["Monitoring Dashboard<br/>Prometheus/Grafana"]
    Logs -->|Centralized| LogService["Log Aggregation<br/>ELK/Datadog"]
    Traces -->|Distributed| TraceService["Trace Analysis<br/>Jaeger/Datadog"]
    
    Dashboard --> Alert["Alerting System"]
    LogService --> Alert
    TraceService --> Alert
    
    Alert -->|High Error Rate| Page["🚨 Page On-Call"]
    Alert -->|Slow Response| Warn["⚠️ Warning Notification"]
    Alert -->|Normal| OK["✓ All Clear"]
    
    Page --> Response["Incident Response<br/>- Investigate<br/>- Fix<br/>- Deploy"]
    Warn --> Check["Check System<br/>Optimize if needed"]
```

---

## 26. BACKUP & DISASTER RECOVERY

```mermaid
graph TB
    DB["PostgreSQL Database"]
    
    DB -->|Continuous| WAL["Write-Ahead Log<br/>(WAL)"]
    DB -->|Daily| Full["Full Backup<br/>Snapshot"]
    
    WAL -->|Store| S3_WAL["AWS S3<br/>WAL Storage"]
    Full -->|Store| S3_Full["AWS S3<br/>Backup Vault"]
    
    S3_Full -->|Test Recovery| TestRestore["Test Restore<br/>Weekly Verify"]
    
    TestRestore -->|Success| Confidence["✓ Verified<br/>Recovery plan<br/>validated"]
    
    subgraph Disaster["Disaster Scenario"]
        Incident["Data Loss Incident"]
        Incident -->|Restore| Choose["Choose Recovery Point<br/>- Latest backup<br/>- Point-in-time"]
        Choose -->|Restore DB| Restore["Restore Database<br/>From backup"]
        Restore -->|Verify| Verify["Verify Data Integrity<br/>Check consistency"]
        Verify -->|Update App| Redirect["Redirect to<br/>Restored DB"]
        Redirect -->|Resume| Service["Resume Service"]
    end
    
    S3_WAL --> Disaster
    S3_Full --> Disaster
    Service -->|Notify| Users["Notify Users<br/>of incident"]
```

This complete technical architecture documentation provides a comprehensive view of all system components, data flows, and operational procedures for the TMJ Diagnosis System.

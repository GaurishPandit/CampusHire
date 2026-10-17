# CampusHire — Campus Placement & Opportunities Platform

A production-minded, full-stack campus recruitment and placement management platform engineered for colleges, students, and placement cells.

---

## 🌐 Live Deployment

| Service | URL |
|---|---|
| **Frontend** (Vercel) | [https://campus-hire-zeta.vercel.app](https://campus-hire-zeta.vercel.app) |
| **Backend API** (Render) | [https://campushire-ssix.onrender.com/api/v1](https://campushire-ssix.onrender.com/api/v1) |
| **Health Check** | [https://campushire-ssix.onrender.com/api/v1/health](https://campushire-ssix.onrender.com/api/v1/health) |
| **Database** | MongoDB Atlas (cloud-hosted) |

> **Note:** The Render backend may take 30–60 seconds to respond on the first request if it has been idle (free-tier cold start). Subsequent requests are fast.

---

## 🌟 Key Capabilities & Features

### 1. Role-Based Access Control (RBAC)
- **Student**: Discovers eligible campus drives, reviews explainable criteria outcomes, submits internal applications or confirms external portal links, tracks stage-by-stage round progression, and reviews officially announced final selections.
- **Placement Administrator**: Bulk-imports verified student cohorts from CSV with pre-commit validation, configures job/internship opportunities with precise eligibility limits, creates structured recruitment rounds, manages candidate stage outcomes, and transactionally publishes verified final selections.
- **System Administrator**: Configures college profiles, manages authorized administrator accounts, and reviews immutable compliance audit logs.

### 2. Deterministic Server-Side Eligibility Engine
- Evaluates:
  - **Minimum CGPA** (decimal precision)
  - **Maximum Permitted Active Backlogs**
  - **Eligible Department Branches** (case-insensitive array matching)
  - **Eligible Graduation Batches**
  - **Profile Completeness & Verification Safeguards**
- Returns deterministic statuses: `eligible`, `not_eligible`, or `needs_verification`.
- Provides human-readable, transparent reasoning.
- **Zero AI hallucination** in eligibility decisions; re-validated server-side upon application submission.
- Preserves an immutable snapshot of criteria with each application record.

### 3. Verified Student Onboarding & CSV Import
- Pre-commit multi-row validation (headers, data types, email formatting, CGPA bounds 0–10).
- Automatic duplicate detection against existing student roll numbers and emails.
- Validation preview interface before committing to the database.
- Secure, invitation-based token activation (no plaintext passwords in CSV).
- Read-only verified academic fields with full administrator verification auditing.

### 4. Application Workflows & Recruitment Pipeline
- **Internal Applications**: One-click application with duplicate prevention (unique compound index on `{ student, opportunity }`).
- **External Applications**: Outbound link tracking with explicit student submission confirmation.
- **Configurable Ordered Rounds**: Online assessments, coding tests, technical interviews, HR rounds, and final selections.
- **Stage Progression**: Individual candidate outcomes tracked independently of overall drive stage.

### 5. Final Selection Publication & Privacy Rules
- Transactional publication workflow authorized for placement administrators.
- Strict data privacy: Publicly published results display only approved snapshot fields (candidate name, branch, opportunity, company). Private records, roll numbers, and personal academic details remain confidential.

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 18, Vite, TypeScript, Tailwind CSS v4, React Router v6, Axios, Lucide React, Recharts, React Hot Toast |
| **Backend** | Node.js, Express.js (REST API under `/api/v1`), Zod validation, Helmet security headers, CORS, Cookie-Parser, Morgan, Winston logger, Express Rate Limit |
| **Database** | MongoDB Atlas / MongoDB Server, Mongoose ODM with compound indexes |
| **Authentication** | HTTP-only cookies, JWT (Access + Refresh tokens), bcrypt password hashing |

---

## 🚀 Quick Start & Local Setup

### Prerequisites
- Node.js >= 18.0.0
- MongoDB running locally or a MongoDB Atlas connection string

### 1. Backend Setup
```bash
cd server
npm install
cp .env.example .env
```
Ensure your `server/.env` contains your MongoDB URI and JWT secrets:
```env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/campushire
JWT_ACCESS_SECRET=your-secure-jwt-access-secret-min-64-characters
JWT_REFRESH_SECRET=your-secure-jwt-refresh-secret-min-64-characters
CLIENT_URL=http://localhost:5173
```

### 2. Seed Synthetic Demo Data
```bash
npm run seed
```
This provisions a demo college, system administrator, placement officer, and student cohorts.

### 3. Start Backend Server
```bash
npm run dev
# or: npm start
```
Server runs at `http://localhost:5000` (Health check: `http://localhost:5000/api/v1/health`).

### 4. Frontend Setup
```bash
cd ../client
npm install
npm run dev
```
Client runs at `http://localhost:5173`.

---

## 🧪 Running Automated Tests

The backend test suite validates the deterministic eligibility engine, application status transitions, opportunity state machines, and CSV parser validation:

```bash
cd server
npm test
```

Test coverage includes:
- ✅ Deterministic eligibility rules (CGPA, backlogs, branches, graduation batches)
- ✅ Missing and unverified academic data safeguards (`needs_verification`)
- ✅ Strict application status state machine transitions
- ✅ Opportunity lifecycle transitions (`draft` → `published` → `closed` → `completed`)
- ✅ CSV parsing, missing column validation, and duplicate detection

---

## 🔑 Demo Credentials

> Try them instantly on the **[live app](https://campus-hire-zeta.vercel.app)** — click any demo account button on the login page for 1-click fill.

| Role | Email | Password | Scope |
|---|---|---|---|
| **Placement Admin** | `admin@demo.edu.in` | `Admin@12345` | Manages drives, rounds, imports & publishes results |
| **Student (Eligible)** | `alice@demo.edu.in` | `Student@12345` | CSE 2025, CGPA 8.5, 0 backlogs |
| **Student (Filtered)** | `dave@demo.edu.in` | `Student@12345` | Mech 2025, CGPA 6.8, 2 backlogs |
| **Sys Admin** | `sysadmin@campushire.dev` | `Admin@12345` | College configuration & audit oversight |

---

## 📁 Repository Structure

```
CampusHire/
├── client/                     # Vite + React + TypeScript Frontend
│   ├── src/
│   │   ├── api/                # Typed Axios API clients & endpoints
│   │   ├── components/         # Layout (AppLayout, ProtectedRoute) & UI components
│   │   ├── context/            # AuthContext (auth state, session refresh)
│   │   ├── pages/
│   │   │   ├── admin/          # Dashboard, CSV Import, Opportunities, Rounds, Audit Logs
│   │   │   ├── auth/           # Login & Account Activation
│   │   │   └── student/        # Dashboard, Opportunities, Detail, Applications, Profile, Results
│   │   ├── App.tsx             # Route definitions & RBAC guards
│   │   └── main.tsx            # App root mount with React Router & Toast provider
│   └── vite.config.ts          # Vite configuration with proxy to backend
│
├── server/                     # Node.js + Express + Mongoose Backend
│   ├── src/
│   │   ├── config/             # Environment & DB connection
│   │   ├── controllers/        # Auth, Student, Opportunity, Application, Result, Dashboard
│   │   ├── middleware/         # Auth, Roles, Validation, Rate Limiter, Error Handler
│   │   ├── models/             # College, User, StudentProfile, Opportunity, RecruitmentRound, Application, SelectionResult, AuditLog
│   │   ├── routes/v1/          # Versioned REST API routes
│   │   ├── services/           # Eligibility engine, Audit logger, Email dispatcher
│   │   ├── validators/         # Zod schemas for input validation
│   │   ├── seed.js             # Synthetic database seeder
│   │   └── server.js           # Server entry point
│   └── tests/                  # Jest test suites (Eligibility & CSV validation)
└── README.md
```

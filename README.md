# 🔐 SecureVault

> A production-grade, security-first credential and notes manager built with React/Next.js, Node.js/Express, and Python/FastAPI — demonstrating full stack engineering and applied cybersecurity principles.

[![Node.js](https://img.shields.io/badge/Node.js-18+-green)](https://nodejs.org)
[![Next.js](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org)
[![Python](https://img.shields.io/badge/Python-3.11+-blue)](https://python.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow)](LICENSE)
[![OWASP](https://img.shields.io/badge/OWASP%20Top%2010-Mitigated-red)](SECURITY.md)

---

## 📸 Screenshots

<table>
  <tr>
    <td><img src="docs/Screenshot_2026-02-22_075119.png" alt="Login Page" width="400"/><br/><sub><b>Login Page</b></sub></td>
    <td><img src="docs/Screenshot_2026-02-22_075245.png" alt="Register Page" width="400"/><br/><sub><b>Register — enforces strong password policy</b></sub></td>
  </tr>
  <tr>
    <td><img src="docs/Screenshot_2026-02-22_082703.png" alt="Empty Vault" width="400"/><br/><sub><b>Empty Vault Dashboard</b></sub></td>
    <td><img src="docs/Screenshot_2026-02-22_082907.png" alt="Vault with Entries" width="400"/><br/><sub><b>Vault with Encrypted Entries</b></sub></td>
  </tr>
  <tr>
    <td><img src="docs/Screenshot_2026-02-22_083032.png" alt="Create Entry Modal" width="400"/><br/><sub><b>Create Entry — AES-256-GCM encrypted before storage</b></sub></td>
    <td></td>
  </tr>
</table>

---

## 📌 Overview

SecureVault is a secure, full-stack credential and notes manager designed with security as a first-class concern — not an afterthought. Every design decision maps directly to a real-world security principle.

Users can store sensitive notes and credentials in an encrypted personal vault. All data is encrypted at rest using AES-256-GCM, authentication uses JWT with refresh token rotation, and the app actively checks if stored passwords have appeared in known data breaches using the k-anonymity model.

**This project was built to demonstrate the intersection of full stack development and applied cybersecurity.**

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT BROWSER                           │
│                     React / Next.js 14                          │
│              CSP Headers · HTTPS Only · Input Validation        │
└─────────────────────────┬───────────────────────────────────────┘
                          │ HTTPS + JWT Bearer Token
┌─────────────────────────▼───────────────────────────────────────┐
│                   PRIMARY API (Node.js/Express)                 │
│        Auth · Vault CRUD · Rate Limiting · Helmet.js            │
│          bcrypt · JWT Refresh Rotation · CORS Lockdown          │
└──────────┬──────────────────────────────────┬───────────────────┘
           │ PostgreSQL (parameterized queries) │ Internal HTTP
           │                                    │
┌──────────▼──────────┐            ┌────────────▼────────────────┐
│     PostgreSQL       │            │  Security Microservice      │
│  Encrypted Fields    │            │   Python / FastAPI          │
│  Parameterized SQL   │            │  AES-256 Encrypt/Decrypt    │
└─────────────────────┘            │  HaveIBeenPwned (k-anon)    │
                                   │  Security Audit Reports      │
                                   └─────────────────────────────┘
```

---

## 🛡️ Security Features

### OWASP Top 10 Coverage

| OWASP Risk | Mitigation Implemented |
|---|---|
| A01 - Broken Access Control | JWT auth on all routes, user-scoped data queries |
| A02 - Cryptographic Failures | AES-256-GCM encryption at rest, bcrypt for passwords |
| A03 - Injection | Parameterized queries, input sanitization via express-validator |
| A05 - Security Misconfiguration | Helmet.js, strict CORS, env-based secrets |
| A07 - Auth & Identification Failures | Refresh token rotation, rate limiting on auth routes |
| A09 - Security Logging & Monitoring | Request logging, failed auth tracking |

### Additional Security Controls
- **Rate Limiting** — 10 auth attempts per 15 minutes per IP
- **Content Security Policy** — Strict CSP headers via Helmet.js
- **k-Anonymity Password Checking** — Passwords checked against HaveIBeenPwned without ever sending plaintext
- **Refresh Token Rotation** — Single-use refresh tokens; stolen tokens are invalidated on reuse
- **Bcrypt** — Password hashing with cost factor 12
- **AES-256-GCM** — Authenticated encryption for vault entries (prevents tampering)

---

## 🧰 Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| Frontend | Next.js 14, React, TailwindCSS | UI, SSR, routing |
| Primary API | Node.js, Express.js | REST API, auth, business logic |
| Security Service | Python 3.11+, FastAPI | Encryption, breach detection |
| Database | PostgreSQL | Persistent storage |
| Auth | JWT (access + refresh tokens) | Stateless authentication |
| Password Hashing | bcrypt (cost 12) | Secure credential storage |
| Encryption | AES-256-GCM | Vault entry encryption at rest |

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- Python 3.11+
- PostgreSQL 15+

### 1. Clone the repo
```bash
git clone https://github.com/JeremiahDDT/securevault.git
cd securevault
```

### 2. Set up environment variables

**Backend** (`backend/.env`):
```env
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/securevault
JWT_ACCESS_SECRET=your-super-secret-access-key-min-32-chars
JWT_REFRESH_SECRET=your-super-secret-refresh-key-min-32-chars
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES=7d
SECURITY_SERVICE_URL=http://localhost:8001
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
```

**Security Service** (`security-service/.env`):
```env
VAULT_ENCRYPTION_KEY=your-32-byte-hex-encryption-key
PORT=8001
```

**Frontend** (`frontend/.env.local`):
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### 3. Set up the database
```bash
psql -U postgres
CREATE DATABASE securevault;
\c securevault
```
Then run the schema from `backend/src/config/schema.sql`

### 4. Start all services

**Option A — Automated (Windows):**
```bash
.\start-all.bat
```

**Option B — Manual (three separate terminals):**
```bash
# Terminal 1 - Frontend
cd frontend && npm install && npm run dev

# Terminal 2 - Backend
cd backend && npm install && node src/index.js

# Terminal 3 - Security Service
cd security-service && pip install -r requirements.txt
python -m uvicorn main:app --port 8001
```

App runs at **http://localhost:3000**

---

## 📁 Project Structure

```
securevault/
├── frontend/                  # Next.js 14 application
│   └── src/
│       ├── app/               # Login, Register, Vault pages
│       ├── components/        # React components
│       └── lib/               # API client with token refresh
│
├── backend/                   # Node.js/Express API
│   └── src/
│       ├── routes/            # Auth & vault endpoints
│       ├── middleware/        # JWT auth, rate limiting
│       ├── controllers/       # Business logic
│       └── config/            # Database & schema
│
├── security-service/          # Python/FastAPI microservice
│   ├── routers/               # Encrypt, breach, audit endpoints
│   └── services/              # AES-256-GCM, HIBP integration
│
├── docs/                      # Screenshots
├── start-all.bat              # One-command startup (Windows)
├── SECURITY.md                # Threat model & security architecture
└── docker-compose.yml         # Local dev environment
```

---

## 🔑 API Reference

### Auth Endpoints
| Method | Route | Description |
|---|---|---|
| POST | `/api/auth/register` | Create account (bcrypt hashed) |
| POST | `/api/auth/login` | Login, receive token pair |
| POST | `/api/auth/refresh` | Rotate refresh token |
| POST | `/api/auth/logout` | Invalidate refresh token |

### Vault Endpoints
| Method | Route | Description |
|---|---|---|
| GET | `/api/vault` | List user's vault entries |
| POST | `/api/vault` | Create encrypted entry |
| PUT | `/api/vault/:id` | Update entry |
| DELETE | `/api/vault/:id` | Delete entry |

### Security Service Endpoints
| Method | Route | Description |
|---|---|---|
| POST | `/encrypt` | AES-256-GCM encrypt payload |
| POST | `/decrypt` | Decrypt vault entry |
| GET | `/breach-check` | k-anon HIBP password check |
| POST | `/audit` | Generate security audit report |

---

## 📄 License

MIT — see [LICENSE](LICENSE)

---

## 🔗 Related

- [SECURITY.md](SECURITY.md) — Full threat model and security architecture
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [HaveIBeenPwned API](https://haveibeenpwned.com/API/v3)

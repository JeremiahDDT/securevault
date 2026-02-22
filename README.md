# 🔐 SecureVault

> A production-grade, security-first credential and notes manager built with React/Next.js, Node.js/Express, and Python/FastAPI — demonstrating full stack engineering and applied cybersecurity principles.

[![Node.js](https://img.shields.io/badge/Node.js-18+-green)](https://nodejs.org)
[![Next.js](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org)
[![Python](https://img.shields.io/badge/Python-3.11+-blue)](https://python.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow)](LICENSE)
[![OWASP](https://img.shields.io/badge/OWASP%20Top%2010-Mitigated-red)](SECURITY.md)

---

## 📌 Overview

SecureVault is a secure, full-stack credential and notes manager designed with security as a first-class concern — not an afterthought. Every design decision maps directly to a real-world security principle.

Users can store sensitive notes and credentials in an encrypted personal vault. All data is encrypted at rest using AES-256, authentication uses JWT with refresh token rotation, and the app actively checks if stored passwords have appeared in known data breaches.

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
| A02 - Cryptographic Failures | AES-256 encryption at rest, bcrypt for passwords |
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
| Security Service | Python 3.11, FastAPI | Encryption, breach detection |
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
git clone https://github.com/YOUR_USERNAME/securevault.git
cd securevault
```

### 2. Set up environment variables

**Backend** (`backend/.env`):
```env
DATABASE_URL=postgresql://user:password@localhost:5432/securevault
JWT_ACCESS_SECRET=your-super-secret-access-key-min-32-chars
JWT_REFRESH_SECRET=your-super-secret-refresh-key-min-32-chars
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES=7d
SECURITY_SERVICE_URL=http://localhost:8000
PORT=3001
NODE_ENV=development
```

**Security Service** (`security-service/.env`):
```env
VAULT_ENCRYPTION_KEY=your-32-byte-hex-encryption-key
HIBP_API_KEY=optional-haveibeenpwned-api-key
PORT=8000
```

**Frontend** (`frontend/.env.local`):
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### 3. Database setup
```bash
cd backend
npm install
npm run db:migrate
```

### 4. Start the backend
```bash
cd backend
npm run dev
```

### 5. Start the security microservice
```bash
cd security-service
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### 6. Start the frontend
```bash
cd frontend
npm install
npm run dev
```

App will be available at `http://localhost:3000`

---

## 📁 Project Structure

```
securevault/
├── frontend/                  # Next.js 14 application
│   └── src/
│       ├── app/               # App router pages
│       ├── components/        # React components
│       │   ├── auth/          # Login, Register forms
│       │   └── vault/         # Vault CRUD UI
│       ├── hooks/             # Custom React hooks
│       └── lib/               # API client, utilities
│
├── backend/                   # Node.js/Express API
│   └── src/
│       ├── routes/            # API route definitions
│       ├── middleware/         # Auth, rate limit, validation
│       ├── controllers/       # Business logic
│       ├── models/            # Database models
│       └── utils/             # JWT, helpers
│
├── security-service/          # Python/FastAPI microservice
│   ├── routers/               # Encrypt, audit endpoints
│   ├── services/              # AES-256, HIBP integration
│   └── models/                # Pydantic schemas
│
├── .github/workflows/         # CI/CD pipeline
├── SECURITY.md                # Security policy & threat model
└── docker-compose.yml         # Local dev environment
```

---

## 🔑 API Reference

### Auth Endpoints (Node.js/Express)
| Method | Route | Description |
|---|---|---|
| POST | `/api/auth/register` | Create account (bcrypt hashed) |
| POST | `/api/auth/login` | Login, receive token pair |
| POST | `/api/auth/refresh` | Rotate refresh token |
| POST | `/api/auth/logout` | Invalidate refresh token |

### Vault Endpoints (Node.js/Express)
| Method | Route | Description |
|---|---|---|
| GET | `/api/vault` | List user's vault entries |
| POST | `/api/vault` | Create encrypted entry |
| PUT | `/api/vault/:id` | Update entry |
| DELETE | `/api/vault/:id` | Delete entry |

### Security Endpoints (Python/FastAPI)
| Method | Route | Description |
|---|---|---|
| POST | `/encrypt` | AES-256-GCM encrypt payload |
| POST | `/decrypt` | Decrypt vault entry |
| GET | `/breach-check` | k-anon HIBP password check |
| GET | `/audit/{user_id}` | Generate security audit report |

---

## 🧪 Running Tests

```bash
# Backend tests
cd backend && npm test

# Security service tests  
cd security-service && pytest

# Frontend tests
cd frontend && npm test
```

---

## 🚢 Deployment

The app is configured for deployment on **Railway** or **Render**:

1. Push to GitHub
2. Connect Railway/Render to your repo
3. Set environment variables in the dashboard
4. Deploy — the `Procfile` and `railway.toml` handle the rest

CI/CD via GitHub Actions automatically runs tests on every push.

---

## 📄 License

MIT — see [LICENSE](LICENSE)

---

## 🔗 Related

- [SECURITY.md](SECURITY.md) — Full threat model and security architecture
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [HaveIBeenPwned API](https://haveibeenpwned.com/API/v3)

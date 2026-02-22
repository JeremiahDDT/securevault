# Security Policy & Threat Model

## Reporting a Vulnerability

If you discover a security vulnerability in SecureVault, please do **not** open a public GitHub issue.

Instead, email: **security@[yourdomain].com**

You will receive a response within 48 hours. If the vulnerability is confirmed, a patch will be prioritized and released with a CVE reference where applicable.

---

## Threat Model

### Assets Being Protected
- User credentials (email + password)
- Vault entries (encrypted notes and stored passwords)
- JWT tokens (access + refresh)
- Encryption keys

### Threat Actors Considered
| Actor | Capability | Motivation |
|---|---|---|
| Unauthenticated attacker | Network access to API | Account takeover, data theft |
| Authenticated malicious user | Valid JWT token | Access other users' data |
| Database attacker | Read access to DB | Mass credential theft |
| Token thief | Stolen JWT | Impersonation |

---

## Security Controls

### 1. Authentication

**Password Storage**
- Passwords are never stored in plaintext
- bcrypt with cost factor 12 is used — each hash takes ~250ms to compute, making brute force impractical
- Password reset tokens are single-use and expire in 1 hour

**JWT Strategy**
- Access tokens expire in **15 minutes** — limits damage window if stolen
- Refresh tokens expire in **7 days** and are single-use (rotated on each use)
- Refresh token reuse detection: if a previously used refresh token is submitted, the entire token family is invalidated (detects token theft)
- Tokens are stored in `httpOnly` cookies to prevent JavaScript access (XSS mitigation)

**Rate Limiting**
- Auth endpoints: 10 requests per 15 minutes per IP
- General API: 100 requests per minute per user
- Implemented via `express-rate-limit`

---

### 2. Encryption at Rest

**Vault Entry Encryption**
- Algorithm: AES-256-GCM (authenticated encryption)
- GCM mode provides both confidentiality AND integrity — any tampering with ciphertext is detected
- Each vault entry uses a unique random IV (initialization vector)
- The authentication tag is stored alongside ciphertext to detect modification

**Key Management**
- The vault encryption key is stored as an environment variable, never in source code or database
- In production, this should be managed by a secrets manager (AWS Secrets Manager, HashiCorp Vault)

**Why AES-256-GCM over AES-256-CBC?**
- CBC mode is malleable — an attacker can flip bits in ciphertext to predictably alter plaintext
- GCM mode includes a MAC (message authentication code), making tampering detectable
- GCM is also faster due to hardware acceleration on modern CPUs

---

### 3. Transport Security

- HTTPS enforced in production (HTTP → HTTPS redirect)
- HSTS header set with `max-age=31536000; includeSubDomains`
- TLS 1.2 minimum; TLS 1.3 preferred

---

### 4. Input Validation & Injection Prevention

**SQL Injection**
- All database queries use parameterized statements via `pg` library
- No raw string interpolation in queries
- Example of what we do NOT do: `SELECT * FROM users WHERE email = '${email}'`

**XSS Prevention**
- Content Security Policy header prevents inline script execution
- All user input is sanitized server-side using `express-validator`
- React's default JSX escaping prevents reflected XSS on the frontend

**Command Injection**
- No shell commands constructed from user input
- File operations use safe APIs only

---

### 5. Access Control

- All vault endpoints verify ownership: `WHERE id = $1 AND user_id = $2`
- Users cannot access, modify, or delete other users' entries
- JWT payload is verified on every protected request — no reliance on client-sent user IDs
- CORS is locked to the specific frontend origin only

---

### 6. Security Headers (Helmet.js)

```
Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
Strict-Transport-Security: max-age=31536000; includeSubDomains
```

---

### 7. HaveIBeenPwned Integration (k-Anonymity)

When a user stores a password, SecureVault checks if it has appeared in known data breaches using the [HIBP Pwned Passwords API](https://haveibeenpwned.com/API/v3).

**Privacy-preserving implementation using k-Anonymity:**

```
1. SHA-1 hash the password locally: SHA1("password") → "5BAA61E4C9..."
2. Send only the FIRST 5 CHARACTERS to the API: "5BAA6"
3. The API returns all hashes starting with "5BAA6" (~500 results)
4. Search the returned list locally for the full hash
5. If found → password is compromised
```

The plaintext password and full hash **never leave the server**. This is the same technique used by 1Password and Firefox Monitor.

---

## Known Limitations & Future Improvements

- [ ] Multi-factor authentication (TOTP/WebAuthn)
- [ ] End-to-end encryption (client-side encryption before server transmission)
- [ ] Key rotation mechanism for vault entries
- [ ] Audit log for all vault access events
- [ ] IP-based suspicious activity alerts
- [ ] Hardware security key support (FIDO2)

---

## Relevant Standards & Frameworks

- [OWASP Top 10 2021](https://owasp.org/www-project-top-ten/)
- [NIST SP 800-63B](https://pages.nist.gov/800-63-3/sp800-63b.html) — Digital Identity Guidelines
- [CWE/SANS Top 25](https://cwe.mitre.org/top25/)

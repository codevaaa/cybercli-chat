---
name: security-audit
description: Comprehensive security audit methodology covering OWASP Top 10, dependency scanning, secrets detection, and threat modeling. Use when auditing code for vulnerabilities, checking security posture, or performing penetration testing analysis.
agents: [security-engineer, code-reviewer]
tags: [security, owasp, audit, vulnerabilities, pentest]
version: 1.0.0
author: CodeVaa Team
---

# Security Audit Skill

## Goal
Systematically identify security vulnerabilities in a codebase and provide actionable remediation with severity ratings.

## Audit Methodology

### Phase 1: Reconnaissance
1. Map the attack surface (all entry points: routes, file uploads, WebSocket, CLI inputs)
2. Identify authentication and authorization mechanisms
3. Catalog all external dependencies and their versions
4. Find all places where user input is processed

### Phase 2: OWASP Top 10 Checklist

#### A01: Broken Access Control
- [ ] Authorization checks on every protected endpoint
- [ ] IDOR (Insecure Direct Object Reference) possible?
- [ ] Privilege escalation vectors?
- [ ] CORS misconfiguration?
- [ ] Missing rate limiting on sensitive operations?

#### A02: Cryptographic Failures
- [ ] Sensitive data encrypted at rest and in transit?
- [ ] Strong hashing for passwords (bcrypt/argon2, not MD5/SHA1)?
- [ ] Proper key management (not hardcoded)?
- [ ] TLS everywhere (no HTTP fallback)?

#### A03: Injection
- [ ] SQL injection (parameterized queries used everywhere?)
- [ ] NoSQL injection (MongoDB operator injection?)
- [ ] Command injection (user input in shell commands?)
- [ ] LDAP/XPath/Template injection?

#### A04: Insecure Design
- [ ] Business logic flaws?
- [ ] Missing rate limiting?
- [ ] Lack of input validation at design level?

#### A05: Security Misconfiguration
- [ ] Default credentials anywhere?
- [ ] Unnecessary features enabled?
- [ ] Verbose error messages exposing internals?
- [ ] Security headers set (CSP, HSTS, X-Frame-Options)?

#### A06: Vulnerable Components
- [ ] Known CVEs in dependencies? (`npm audit` / `pip audit`)
- [ ] Outdated libraries with public exploits?
- [ ] Unmaintained dependencies?

#### A07: Authentication Failures
- [ ] Brute force protection?
- [ ] Session fixation possible?
- [ ] JWT secret strength? Algorithm confusion?
- [ ] Account enumeration via error messages?

#### A08: Software and Data Integrity
- [ ] Deserialization attacks possible?
- [ ] CI/CD pipeline secured?
- [ ] SRI (Subresource Integrity) for CDN assets?

#### A09: Logging and Monitoring
- [ ] Sensitive data in logs (passwords, tokens, PII)?
- [ ] Sufficient logging for forensics?
- [ ] Alerting on suspicious patterns?

#### A10: SSRF (Server-Side Request Forgery)
- [ ] User-supplied URLs fetched server-side?
- [ ] Internal network accessible via SSRF?
- [ ] URL validation/allowlisting?

### Phase 3: Secrets Detection
Scan for:
- API keys, tokens, passwords in code
- `.env` files committed to git
- Secrets in git history (`git log -p --all -S 'password'`)
- Hardcoded credentials in config files

### Phase 4: Dependency Audit
```bash
npm audit
pip audit
cargo audit
```

## Output Format
For each finding:
```
[SEVERITY] Finding Title
Location: file:line
Description: What's wrong
Impact: What an attacker could do
Remediation: How to fix it
CWE: CWE-XXX
```

Severity levels:
- 🔴 **CRITICAL** — Immediate exploitation possible, data breach likely
- 🟠 **HIGH** — Exploitable with moderate effort
- 🟡 **MEDIUM** — Requires specific conditions to exploit
- 🔵 **LOW** — Minimal impact or very difficult to exploit
- ℹ️ **INFO** — Best practice recommendation, no immediate risk

## Constraints
- Never execute actual exploits against production systems
- Never expose or log real secrets found during audit
- Always provide remediation for every finding
- Prioritize findings by real-world exploitability, not theoretical risk

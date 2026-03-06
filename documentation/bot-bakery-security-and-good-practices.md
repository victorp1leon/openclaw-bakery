# OpenClaw Security and Good Practices Guide (Local VM + Bakery Bot)

Status: MVP
Last Updated: 2026-02-26

## Scope

This guide consolidates security recommendations and engineering good practices for the OpenClaw Bakery Bot:
- local development in a VirtualBox Ubuntu VM
- conversational bot runtime (console / Telegram)
- OpenClaw + local model endpoint
- business actions with external integrations (Google Sheets, Trello, Netlify)

Core principle:
- The LLM interprets text to structured data.
- The runtime validates, authorizes, confirms, and only then executes tools.

## 1) Core Engineering and Security Principles

1. The model is not trusted.
Treat LLM output as untrusted input that may be wrong, manipulated, or incomplete.

2. Strict separation of interpretation and execution.
The LLM proposes. A deterministic policy/guard layer validates and authorizes.

3. Least privilege and defense in depth.
Scope permissions per tool/integration. Harden the VM/host and enforce access controls.

4. Auditable and safe-by-default flows.
Every business action should be traceable, idempotent where applicable, and blocked until explicit confirmation.

## 2) Recommended Standards and Frameworks

Use these as references (not all need to be adopted at once):

### Security program / controls
- NIST Cybersecurity Framework 2.0 (CSF)
- CIS Critical Security Controls v8/v8.1
- ISO/IEC 27001 (if formalizing governance later)

### Secure SDLC / application security
- NIST SSDF (SP 800-218)
- OWASP SAMM
- OWASP ASVS
- OWASP API Security (relevant for webhooks and integrations)

### LLM / agent-specific guidance
- OWASP Top 10 for LLM Applications
- NIST AI RMF 1.0
- ISO/IEC 42001 (AI management system, optional for future maturity)

### Privacy (Mexico)
- LFPDPPP (if processing customer personal data)
- ISO/IEC 27701 (privacy management extension, optional)

### Supply chain / build integrity
- SLSA
- SBOM minimum elements (NTIA/CISA guidance)

## 3) Secure Architecture Pattern (Recommended)

Pattern:
1. Channel ingress (console/Telegram)
2. Normalization and optional PII-safe logging layer
3. LLM interpreter (untrusted)
4. Deterministic policy/guard layer
   - schema validation
   - allowlist / authorization
   - business rules
   - confirmation gate
   - idempotency / dedupe
5. Tool runner (least privilege)
6. Persistence + audit trail + user response

Rules of thumb:
- Never execute raw model text as shell/SQL/HTTP instructions.
- Every tool must be allowlisted and use a strict input/output contract.
- Deny by default when validation or policy checks fail.

## 4) Confirmation and Safety Controls (Mandatory for This Bot)

### 4.1 Universal confirmation gate
Any external action (Sheets/Trello/Netlify) must use a two-phase flow:
- Phase 1: build and show structured summary (`pending` state)
- Phase 2: explicit `confirmar` or `cancelar`
- Only `confirmar` can execute a tool

### 4.2 One missing field per turn
Ask for exactly one missing field per turn to reduce ambiguity, state drift, and user errors.

### 4.3 Idempotency and dedupe
- Generate an `operation_id` for every confirmable action.
- Store operation status and result.
- Apply conversational dedupe (short window) separately from technical idempotency.

## 5) Local VM / Network Exposure (VirtualBox + Ubuntu)

### 5.1 Golden rule: do not expose the runtime UI/API unnecessarily
- Bind local services to `127.0.0.1` only.
- Avoid `0.0.0.0` unless explicitly required and controlled.

### 5.2 VirtualBox recommendations
- Prefer NAT without port forwarding.
- Avoid Bridged Adapter unless required.
- Avoid port forwarding to the LAN for development UIs.

### 5.3 Access local UI safely from host machine
If you need to access a UI from the host, use SSH port forwarding instead of opening ports:

```bash
ssh -p 2222 -L 8080:127.0.0.1:8080 user@127.0.0.1
```

Then open `http://localhost:8080` on the host.

### 5.4 Verify listening interfaces
Inside the VM:

```bash
ss -tulpn | grep -E 'LISTEN|openclaw|node'
```

Expected for local services: `127.0.0.1:<port>` (not `0.0.0.0:<port>`).

## 6) Basic Host Hardening (Ubuntu VM)

### 6.1 User and privileges
- Run services as a non-root user.
- Use `sudo` only when needed.
- Disable root SSH login if SSH is enabled.

### 6.2 System updates
```bash
sudo apt update && sudo apt upgrade -y
```

Optional:
```bash
sudo apt install unattended-upgrades
```

### 6.3 Firewall (UFW)
Even on a local VM, a default-deny inbound policy is a good baseline.

```bash
sudo apt install ufw -y
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw enable
sudo ufw status verbose
```

If SSH is needed:
```bash
sudo ufw allow 22/tcp
```

## 7) Secrets Management (Tokens / API Keys)

### 7.1 Never store secrets in the repository
Ensure `.gitignore` covers:

```gitignore
.env
.env.*
*.key
*.pem
bot.db
*.sqlite
```

### 7.2 Preferred for local development: per-session environment variables
```bash
export OPENAI_API_KEY="..."
export TRELLO_TOKEN="..."
export SHEETS_WEBAPP_URL="..."
```

### 7.3 If persistent storage is needed
Store secrets outside the repo with strict file permissions.

### 7.4 Avoid shell history leaks
Use `HISTCONTROL=ignorespace:erasedups` and prefix secret exports with a leading space.

### 7.5 Rotation
If a key ever appears in logs, shell history, or git, revoke/rotate it immediately.

## 8) Supply Chain and Workspace Hygiene

### 8.1 Skills / scripts from external sources
- Do not run unreviewed skills or scripts from the internet.
- Avoid `curl | bash` patterns.
- Review scripts before execution (especially network calls, token handling, file operations).

### 8.2 Dependencies (Node/NPM)
- Prefer lockfile-pinned installs.
- Run `npm audit` periodically.
- Avoid unmaintained or obscure packages for critical paths.

## 9) Channel and Integration Security

### 9.1 Telegram channel
- Enforce strict `chat_id` allowlist.
- Ignore unsupported message types in MVP (text only).
- Rate limit per chat and use backoff to prevent spam/DoS.
- Avoid attachments in MVP unless explicitly supported.

If using webhooks later (instead of long polling):
- validate Telegram webhook secret token (`X-Telegram-Bot-Api-Secret-Token`)

### 9.2 Tool privileges (least privilege)
- Google Sheets Apps Script endpoint: append-only where possible
- Trello token: scope to the minimum board/list actions required
- Netlify token: scope to the single site/deploy operation if possible

## 10) Logging, Traceability, and Privacy

### 10.1 Structured logging
Include identifiers such as:
- `chat_id`
- `operation_id`
- `intent`
- `tool_name`
- `status`

### 10.2 Redaction
Never log:
- tokens/keys/secrets
- authorization headers
- full sensitive payloads when avoidable (addresses, phone numbers, etc.)

Use automatic redaction in the logger where possible.

### 10.3 Log levels
- `info` for normal runtime operation
- `debug` only temporarily while troubleshooting

### 10.4 Privacy and retention (LFPDPPP)
Typical bakery bot data may include customer name, phone, address, and order history.
Recommended practices:
- data minimization
- retention policy
- privacy notice when applicable
- process for ARCO rights requests if personal data is stored

## 11) Data Storage, Backups, and VM Snapshots

### 11.1 VirtualBox snapshots
Snapshots may include secrets, local databases, and temp files.
Treat snapshots as sensitive backups.

### 11.2 Local database backups
- Do not publish `bot.db` to public repos.
- Encrypt backups if stored in the cloud.
- Test restore procedures, not only backup creation.

## 12) Observability and Testing Good Practices

### 12.1 Observability
- Structured logs with redaction
- Correlation IDs / `operation_id`
- Metrics: latency, tool failures, policy rejects, retries
- Traces when the architecture grows (OpenTelemetry recommended)

### 12.2 Tests
- Unit tests for the policy/guard layer (hard rules)
- Regression tests per skill/tool
- Failure-path tests (timeouts, invalid JSON, retries, denied actions)
- Prompt-injection style tests (attempts to bypass confirmation or alter values)

## 13) MVP Security Checklist

### Functional safety
- [ ] `chat_id` allowlist enforced
- [ ] Explicit confirmation required before external actions
- [ ] Deterministic validation (schema + business rules, deny-by-default)
- [ ] `operation_id` / idempotency key per action
- [ ] Audit trail (who/what/when/result)

### Hardening
- [ ] Secrets outside the repo
- [ ] VM services bind to `127.0.0.1` unless explicitly required
- [ ] Minimal inbound exposure / firewall enabled
- [ ] Rate limiting / throttling for channel and model calls
- [ ] Logs redact secrets and sensitive fields

### Operations
- [ ] Backup and restore plan for SQLite/state
- [ ] Key rotation plan
- [ ] Runbook for integration failures

### SDLC
- [ ] Specs updated before implementation
- [ ] Tests derived from specs
- [ ] Security review for new tools/integrations

## 14) Useful Verification Commands (VM)

### Open listening ports
```bash
ss -tulpn
```

### Listening processes
```bash
sudo lsof -i -P -n | grep LISTEN
```

### Firewall status
```bash
sudo ufw status verbose
```

### Verify git ignores secret files
```bash
git check-ignore -v .env bot.db
```

## 15) Reference Links

- OWASP Top 10 (Web): https://owasp.org/Top10/2021/
- OWASP ASVS: https://owasp.org/www-project-application-security-verification-standard/
- OWASP Top 10 for LLM Applications: https://owasp.org/www-project-top-10-for-large-language-model-applications/
- UK NCSC - Prompt injection guidance: https://www.ncsc.gov.uk/blog-post/prompt-injection-is-not-sql-injection
- NIST AI RMF 1.0: https://www.nist.gov/itl/ai-risk-management-framework
- NIST SSDF (SP 800-218): https://csrc.nist.gov/pubs/sp/800/218/final
- NIST CSF 2.0: https://www.nist.gov/cyberframework
- CIS Controls v8: https://www.cisecurity.org/controls/v8
- Telegram Bot API: https://core.telegram.org/bots/api
- LFPDPPP (Mexico): https://www.diputados.gob.mx/LeyesBiblio/pdf/LFPDPPP.pdf
- SLSA: https://slsa.dev/

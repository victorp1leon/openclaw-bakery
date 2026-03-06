# Sensitive Payload Logging Policy

Status: MVP
Last Updated: 2026-03-03

Scope: all runtime logs/traces produced by bot-bakery components.

## 1) Objective
Provide useful diagnostics without exposing secrets or sensitive business/customer data.

## 2) Data classification

### Class A (never log)
- Credentials/tokens/API keys/secrets.
- Authorization headers/cookies/session tokens.
- Raw provider secrets or signed URLs with credentials.

### Class B (restricted, avoid full payload)
- Customer personal data (name, phone, address).
- Full order/expense payloads containing personal/business-sensitive details.
- Raw model stderr/stdout when it may include sensitive context.

### Class C (safe operational metadata)
- `event`, `channel`, `chat_id` (as operational identifier), `operation_id`.
- intent classification source (`intent_source`, `parse_source`).
- status markers (`pending_confirm`, `executed`, `canceled`, `duplicate`).

## 3) Mandatory logging rules
- Use structured logs.
- Log only preview snippets for user text (`text_preview`) instead of full message when possible.
- Redact known secret patterns and auth headers.
- Keep user-facing errors generic; store diagnostic details only in internal logs (redacted).
- Do not log full tool request headers or bearer tokens.

## 4) Required redaction controls
- Logger redaction keys must include:
  - `*.token`
  - `*.secret`
  - `*.botToken`
  - `*.apiKey`
  - `headers.authorization`
- Any new connector introducing secret-like fields must extend redaction config before merge.

## 5) Allowed trace fields (default)
- `event`
- `chat_id`
- `strict_mode`
- `intent` (if available)
- `intent_source` (if available)
- `parse_source` (if available)
- `detail` only when it does not contain secret/sensitive raw payload

## 6) Forbidden patterns
- Logging raw `.env` values.
- Logging full inbound/outbound payload bodies by default.
- Logging stack traces directly to end-user channels.
- Logging database dumps in normal runtime paths.

## 7) Incident response for logging leaks
1. Treat as security incident.
2. Rotate exposed credentials immediately.
3. Remove leaked artifacts from retained log stores where possible.
4. Add/patch redaction rules and regression tests.

## 8) Verification checklist
- [ ] Confirm pino redaction config includes required keys.
- [ ] Confirm inbound logs use `text_preview`, not full text body.
- [ ] Confirm connector error logs do not include auth headers/tokens.
- [ ] Confirm user-facing errors contain no stack traces/secrets.

## 9) Automated verification (local/CI)
- `npm run security:scan`: fail-fast scan for high-confidence hardcoded secret patterns in tracked source/scripts/config.
- `npm test`: includes non-regression checks for logging policy (`src/logging/loggingPolicy.test.ts`).
- `npm run verify:security`: convenience command (`security:scan` + tests).

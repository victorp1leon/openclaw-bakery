# Bot Bakery Threat Model (Lightweight STRIDE)

Status: MVP
Last Updated: 2026-03-03

Scope: MVP conversational runtime (`console`/`telegram`), OpenClaw parsing path, SQLite state, and tool adapters.

## 1) Critical assets
- Credentials/secrets: Telegram token, provider credentials, tool integration tokens.
- Business data: expenses, orders, customer-related fields.
- Runtime state: conversation pending context, operation lifecycle records.
- Execution control: confirmation gate and allowlist decisions.

## 2) Trust boundaries
1. External user/channel -> channel adapters.
2. Channel/runtime -> OpenClaw/model parsing path.
3. Runtime -> external tool integrations (Sheets/Trello/hosting).
4. Runtime -> SQLite local persistence.
5. Host/VM environment -> runtime process and logs.

## 3) STRIDE analysis (MVP-focused)

| Category | Example Threat | Current Mitigations | Residual Risk / Next Actions |
|---|---|---|---|
| Spoofing | Unauthorized chat pretending to be operator | `ALLOWLIST_CHAT_IDS`; `chat_id` normalization in Telegram channel | Add optional admin role model when multi-user expansion happens |
| Tampering | Manipulated/invalid LLM output changes payload semantics | Schema validation, missing-field prompts, confirmation gate | Add stricter field provenance checks for high-risk actions |
| Repudiation | User denies having triggered an action | `operation_id`, operation lifecycle persistence, structured traces | Add signed/auditable export of operation history if required |
| Information Disclosure | Secrets or sensitive payload data leaked in logs | Pino redaction config, text preview logging, policy docs | Enforce periodic log review and retention controls |
| Denial of Service | Telegram/API instability or repeated spam input | Polling retry/backoff behavior, controlled timeout config, per-chat rate limiting with burst block | Evaluate distributed/shared limiter strategy for multi-instance deployments |
| Elevation of Privilege | Tool execution without explicit authorization/confirmation | Allowlist + mandatory `confirmar/cancelar` gate | Add per-tool role policy if multiple operators are introduced |

## 4) High-priority abuse scenarios
- Prompt injection attempts to bypass confirmation.
- Duplicate/replayed messages trying to trigger repeated external actions.
- Accidental secret leakage in runtime/connector error logs.
- Misconfigured Telegram channel (`CHANNEL_MODE=telegram` without token).

## 5) Security invariants (must always hold)
- No external action without explicit confirmation.
- Allowlist check before deep processing.
- Rate limiting per chat applies before intent parsing/execution paths.
- Every confirmable operation has an `operation_id`.
- Duplicate detection/idempotency prevents repeated side effects.
- Logs do not expose secrets/tokens/raw authorization headers.

## 6) Validation checklist
- [ ] Verify allowlist rejects unauthorized `chat_id`.
- [ ] Verify confirmation required before tool execution.
- [ ] Verify duplicate request returns deterministic duplicate response.
- [ ] Verify per-chat burst is throttled and returns retry window.
- [ ] Verify redaction hides tokens/secrets in logs.
- [ ] Verify healthcheck fails telegram mode when token is missing.

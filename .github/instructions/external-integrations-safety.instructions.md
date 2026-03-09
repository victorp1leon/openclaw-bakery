---
applyTo: '**/*'
description: Apply security-first rules for external integrations in OpenClaw Bakery, including confirmation gates, dry-run preference, and secret handling.
---

# External Integrations Safety Instruction

## Purpose
Protect runtime operations and data integrity when working with integrations such as Telegram, Sheets, Trello, OpenClaw runtime, and publish workflows.

## Rules
- Do not run external integration actions without explicit business confirmation flow.
- Prefer local validation, dry-run, or simulated execution whenever available.
- Never execute raw model output as shell/SQL/HTTP instructions.
- Keep idempotency protections in place for mutating operations.
- Do not expose secrets, API keys, or sensitive tokens in logs, docs, or examples.
- Preserve allowlist and rate-limit protections when editing channel/runtime flows.

## Operational Guardrails
- Separate parse/validate/confirm from execute phases.
- Fail safely when connector state is unknown.
- Keep retries bounded and explicit.
- If an action was not executed due to safety controls, report it clearly.

## Best Practices
- Validate connector contract changes in specs before runtime changes.
- Prefer additive migration steps with rollback options.
- Document any risk introduced by integration updates.

## References
- `AGENTS.md`
- `documentation/bot-bakery-security-and-good-practices.md`
- `documentation/security/README.md`

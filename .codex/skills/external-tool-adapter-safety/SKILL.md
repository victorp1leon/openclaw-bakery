---
name: external-tool-adapter-safety
description: Deliver external tool adapters safely (CLI/Python/MCP bridge) with allowlist validation, timeout controls, output redaction, feature flags, and smoke-summary evidence. Use when integrating third-party analysis tools into OpenClaw runtime/tools.
---

# external-tool-adapter-safety

## When To Use
- Integrating a new external tool behind `src/tools/*` that executes a local command or script.
- Wiring a runtime/admin command that invokes third-party analysis logic.
- Hardening an existing adapter that currently lacks strong safety controls.

## Workflow
1. Confirm scope and safety gates.
- No code edits without explicit `apruebo`.
- Identify if operation is read-only or mutating and keep live actions gated.

2. Specify adapter contract first.
- Define operations, required inputs, optional inputs, and error envelope.
- Document default-safe behavior (`include_source=false`, bounded output, deterministic error mapping).

3. Implement execution boundary hardening.
- Use `spawn`/`spawnSync` with argument arrays (no shell interpolation).
- Enforce timeout and non-zero exit handling.
- Normalize and validate repo/path inputs against explicit allowlist.
- Reject traversal attempts and out-of-bound paths.
- Sanitize and redact sensitive values in adapter outputs/log fields.
- Cap output size and prefer summaries over raw payload dumps.

4. Wire runtime with explicit activation controls.
- Gate by feature flag from `appConfig`.
- Route only through explicit command/intent triggers.
- Return usage guidance when required fields are missing.
- Emit trace events for both success and failure paths.

5. Add validation coverage.
- Unit tests:
  - allowlisted happy path
  - traversal/invalid path rejection
  - timeout/error mapping
  - redaction/truncation behavior
- Runtime tests:
  - command parsing and missing-field handling
  - feature-flag disabled path
- Config tests:
  - default-safe values
  - env parsing for adapter controls

6. Close with smoke + summary evidence.
- Run dedicated smoke for the adapter in safe mode.
- Run `npm run test:smoke-integration:summary` and review:
  - `reports/smoke-integration/latest-summary.md`
  - `reports/smoke-integration/latest-summary.json`
- If summary fails, report exact failing scenario and linked log in `reports/smoke-integration/history/`.

7. Update collaboration artifacts.
- Update active implementation plan step status.
- Add/refresh session handoff with decisions, evidence, and pending risks.
- If skill/rule/instruction files changed, run registry sync.

## Guardrails
- Do not execute external live mutations unless explicitly requested and approved.
- Do not leak secrets in logs, docs, tests, or sample outputs.
- Do not bypass allowlist checks for convenience.
- Do not mark integration ready without command evidence.

## Quick Commands
- Focused tests: `CI=1 npm test -- --run src/tools/admin/<adapter>.test.ts src/runtime/conversationProcessor.test.ts src/config/appConfig.test.ts`
- Adapter smoke: `npm run smoke:<adapter>`
- Global smoke/integration summary: `npm run test:smoke-integration:summary`
- Registry sync: `npm run codex:skill-registry`

---
name: release-check
description: Run pre-commit release quality checks and summarize readiness. Use when the user asks if current changes are ready to commit, merge, or ship.
---

# release-check

## Workflow
1. Inspect diff surface.
- `git status --short`
- `git diff --name-only`
- Classify changed areas (`src/`, `scripts/`, `documentation/`, `.codex/`).

2. Run minimum validation based on impact.
- Docs-only changes:
  - structural check only (`git diff`, file existence).
- Runtime/tooling code changes (`src/`, `scripts/`):
  - intent-skill coverage gate: `npm run check:intent-skills`
  - focused unit tests first: `npm test -- <target.test.ts>`
  - broaden if needed: `npm test`
- Order lifecycle or integration-sensitive changes:
  - `npm run test:smoke-integration:summary`
  - live mode only if requested: `SMOKE_SUMMARY_LIVE=1 npm run test:smoke-integration:summary`

3. Security and secret hygiene.
- Secret scan:
  - `npm run security:scan`
- Ensure staged set excludes `.env`, tokens, and other credentials.

4. Produce release-readiness summary.
- Report:
  - executed checks
  - pass/fail per check
  - blockers with exact failing command
  - recommendation: `ready` or `not ready`

## Guardrails
- Never claim readiness without running listed checks.
- Do not run live checks unless user explicitly asks.
- Do not stage/commit secret-bearing files.

## Quick Commands
- Baseline suite:
  - `npm run security:scan && npm run check:intent-skills && npm test`
- Smoke/integration summary:
  - `npm run test:smoke-integration:summary`
- Live smoke/integration summary:
  - `SMOKE_SUMMARY_LIVE=1 npm run test:smoke-integration:summary`

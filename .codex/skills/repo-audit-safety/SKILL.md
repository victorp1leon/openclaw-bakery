---
name: repo-audit-safety
description: Run safety-first repository audits for OpenClaw Bakery with evidence-based findings and low-risk remediation. Use when the user asks to audit, clean up, review operational health, or align docs/config/paths without risky architectural rewrites.
---

# repo-audit-safety

## Workflow
1. Confirm scope and safety gates.
- Confirm target surface (repo-wide or specific paths).
- Enforce approval gates:
  - no implementation edits without explicit `apruebo`.
  - no commit flow without explicit `apruebo`.

2. Load mandatory project context.
- Read:
  - `AGENTS.md`
  - `.codex/rules/README.md`
  - `documentation/ai_collaboration/plans/_index.md`
  - `documentation/ai_collaboration/system-map.md`
  - `documentation/ai_implementation/implementation-instructions.md`
- If audit maps to existing work, read latest related handoff in:
  - `documentation/ai_collaboration/plans/**/sessions/`

3. Run non-mutating audit pass first.
- Inventory:
  - `git status --short`
  - `rg --files src documentation .codex`
- Find stale paths/placeholders and suspicious references:
  - `rg -n "YOUR/OPENCLAW/FOLDER/HERE|/workspace|TODO|FIXME" .codex documentation scripts src`
- Use the checklist at:
  - `references/audit-checklist.md`

4. Report findings before changing code.
- Prioritize by severity:
  - High: operational breakage, invalid machine-loaded config, dangerous live behavior.
  - Medium: stale paths/docs drift, missing validation coverage.
  - Low: hygiene improvements and low-risk dedup candidates.
- Provide evidence for each finding:
  - file path
  - risk summary
  - suggested low-risk fix

5. Remediate only after approval.
- Apply only bounded, reversible fixes.
- Do not perform broad architecture refactors by default.
- Keep changes aligned with spec-first docs and local rules.

6. Validate and close.
- Run proportional validation for changed surfaces.
- Report:
  - executed commands
  - pass/fail results
  - explicit limitations
- If task is complex/multi-file, update collaboration artifacts:
  - plan file
  - `plans/_index.md`
  - session handoff

## Guardrails
- Do not run live mutating operations without explicit live flags and user/business confirmation.
- Do not use destructive git commands.
- Do not revert unrelated local changes.
- Do not claim readiness or correctness without command evidence.

## Quick Commands
- Repo state: `git status --short`
- Path scan: `rg -n "YOUR/OPENCLAW/FOLDER/HERE|/workspace" .`
- Rules catalog: `sed -n '1,220p' .codex/rules/README.md`
- Plans index: `sed -n '1,220p' documentation/ai_collaboration/plans/_index.md`

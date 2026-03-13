# Audit Checklist (OpenClaw Bakery)

## 1) Context and Guardrails
- Confirm these were read before proposing fixes:
  - `AGENTS.md`
  - `.codex/rules/README.md`
  - `documentation/ai_collaboration/plans/_index.md`
  - `documentation/ai_collaboration/system-map.md`
  - `documentation/ai_implementation/implementation-instructions.md`
- Confirm approval policy:
  - no implementation edits without `apruebo`
  - no commits without `apruebo`

## 2) Repository Integrity
- Check local state:
  - `git status --short`
  - `git diff --name-only`
- Check stale/generic paths:
  - `rg -n "YOUR/OPENCLAW/FOLDER/HERE|/workspace|\\[.*OPENCLAW.*\\]" .`
- Check references to missing files:
  - validate key doc paths used by AGENTS/rules/plans.

## 3) Runtime and Tooling Surfaces
- Verify map consistency for core folders:
  - `src/runtime/`
  - `src/guards/`
  - `src/skills/`
  - `src/openclaw/`
  - `src/state/`
  - `src/tools/`
  - `src/channel/`
- Look for high-risk drift:
  - config keys consumed vs documented
  - live-mode flags and safe defaults
  - dual-write assumptions (Trello + Sheets) in order flows

## 4) Validation Coverage
- Pick minimum validation proportional to changes:
  - docs-only: structural/path consistency checks
  - code changes: targeted unit tests first
  - integration-sensitive changes: smoke summary command
- Never claim pass without command evidence.

## 5) Findings Format
- For each finding, report:
  - Severity: High / Medium / Low
  - Evidence: file path + observed issue
  - Risk: operational/behavioral impact
  - Proposed fix: low-risk and reversible

## 6) Remediation Gate
- If user did not provide `apruebo`:
  - stop before file edits; provide findings and proposed fixes.
- If user provided `apruebo`:
  - apply only bounded fixes and re-validate.

## 7) Closeout
- Summarize:
  - what changed
  - what was intentionally not changed for safety
  - what was validated
  - what still needs explicit approval

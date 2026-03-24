# Skill Registry

Generated At (UTC): 2026-03-24 19:31:13.727 UTC

## Skills

| Name | Description | Path |
|---|---|---|
| docs-plan-handoff | Maintain collaboration artifacts for complex tasks. Use when work requires creating or updating plans, plans index entries, and session handoff notes. | `.codex/skills/docs-plan-handoff/SKILL.md` |
| env-validate | Validate and normalize .env for unit, smoke, and live flows. Use when the user asks to check missing variables, duplicate keys, or configuration errors before running bot flows. | `.codex/skills/env-validate/SKILL.md` |
| external-tool-adapter-safety | Deliver external tool adapters safely (CLI/Python/MCP bridge) with allowlist validation, timeout controls, output redaction, feature flags, and smoke-summary evidence. Use when integrating third-party analysis tools into OpenClaw runtime/tools. | `.codex/skills/external-tool-adapter-safety/SKILL.md` |
| feature-delivery-flow | Execute end-to-end delivery for missing roadmap features with explicit gates: scope and acceptance criteria, spec-first design/docs, design verification, implementation, unit tests, smoke-integration summary, operational checks, and manual business validation by the user (Instagram). Use when implementing any non-trivial feature across runtime/tools/integrations. | `.codex/skills/feature-delivery-flow/SKILL.md` |
| git-commit | Prepare and create clean git commits in this repository when the user asks to commit changes. Use for staging selected files, writing a conventional commit message, validating what is being committed, and confirming final repo status. | `.codex/skills/git-commit/SKILL.md` |
| grill-me | Run a focused, high-rigor design interview to stress-test a plan before implementation. Use when the user asks to be "grilled", wants to challenge architecture/trade-offs, or needs confidence that open decisions and risks are resolved. | `.codex/skills/grill-me/SKILL.md` |
| order-lifecycle-live-smoke | Run and validate live order lifecycle smoke flows (create, update, cancel) with Trello and Google Sheets consistency checks. | `.codex/skills/order-lifecycle-live-smoke/SKILL.md` |
| order-sync-diagnose | Diagnose order synchronization failures between Trello and Google Sheets, including pending operations, rollback errors, and missing card linkage. | `.codex/skills/order-sync-diagnose/SKILL.md` |
| phase3-intent-delivery | Deliver new roadmap intents (phase 3+) with a fixed gate sequence: spec-first docs, runtime/tool wiring, unit tests, smoke script + summary registration, and plan/handoff closure. Use for intents like shopping.list.generate, inventory.consume, schedule.* and similar. | `.codex/skills/phase3-intent-delivery/SKILL.md` |
| read-only-intent-delivery | Deliver read-only intents end-to-end with consistent patterns for deterministic routing, optional missing-field prompts, tool execution without confirmation flow, reply formatting, tests, smoke registration, and docs/plan closure. Use for intents like schedule.day_view, report.reminders, and similar query/reporting capabilities. | `.codex/skills/read-only-intent-delivery/SKILL.md` |
| release-check | Run pre-commit release quality checks and summarize readiness. Use when the user asks if current changes are ready to commit, merge, or ship. | `.codex/skills/release-check/SKILL.md` |
| repo-audit-safety | Run safety-first repository audits for OpenClaw Bakery with evidence-based findings and low-risk remediation. Use when the user asks to audit, clean up, review operational health, or align docs/config/paths without risky architectural rewrites. | `.codex/skills/repo-audit-safety/SKILL.md` |
| sheets-orders-expenses-cleanup | Safely preview, apply, and verify cleanup of Google Sheets tabs Pedidos and Gastos (clear data rows and restore canonical headers) for test-data resets. | `.codex/skills/sheets-orders-expenses-cleanup/SKILL.md` |
| skill-creator | Guide for creating effective skills. This skill should be used when users want to create a new skill (or update an existing skill) that extends Codex's capabilities with specialized knowledge, workflows, or tool integrations. | `.codex/skills/skill-creator/SKILL.md` |
| skill-registry-sync | Maintain a deterministic local registry of project operational assets (skills, rules, agents, and instructions) to prevent cross-session drift. Use when files are added, removed, or renamed under `.codex/skills`, `.codex/rules`, `.github/agents`, or `.github/instructions`, and before closing a collaboration session that changed these artifacts. | `.codex/skills/skill-registry-sync/SKILL.md` |
| specs-wave-migration | Migrate Spec-Driven documentation waves from `documentation/specs/migration-manifest.md` into canonical specs artifacts (feature packages for `R-*`/`P-*`, contract copies for `C4-*`), update manifest status (`pending` -> `migrated`), and rebuild `documentation/specs/_index.md` feature registry. Use for Wave A/B/C plan entries and Wave C.1 contract migration. | `.codex/skills/specs-wave-migration/SKILL.md` |
| test-smoke-integration | Run and summarize smoke and integration validation flows when the user asks to verify end-to-end behavior. Use for mock/default smoke checks, optional live smoke checks, and reading markdown/json summary artifacts. | `.codex/skills/test-smoke-integration/SKILL.md` |
| test-unit | Run and summarize unit tests for this project when the user asks for unit validation. Use for focused Vitest runs, full unit runs, and optional markdown summary generation from test results. | `.codex/skills/test-unit/SKILL.md` |

## Rules

| Rule | Path |
|---|---|
| approval-keyword-gate | `.codex/rules/approval-keyword-gate.md` |
| code-review-graph-impact-gate | `.codex/rules/code-review-graph-impact-gate.md` |
| documentation-validation-placeholder-filter | `.codex/rules/documentation-validation-placeholder-filter.md` |
| gws-only | `.codex/rules/gws-only.md` |
| intent-disambiguation-guard | `.codex/rules/intent-disambiguation-guard.md` |
| intent-skill-coverage-gate | `.codex/rules/intent-skill-coverage-gate.md` |
| live-flags-gate | `.codex/rules/live-flags-gate.md` |
| mandatory-validation | `.codex/rules/mandatory-validation.md` |
| mutation-clarification-flow-standard | `.codex/rules/mutation-clarification-flow-standard.md` |
| order-dual-write-strict | `.codex/rules/order-dual-write-strict.md` |
| read-only-clarification-flow-standard | `.codex/rules/read-only-clarification-flow-standard.md` |
| read-only-partial-intervention-standard | `.codex/rules/read-only-partial-intervention-standard.md` |
| read-only-trace-ref-standard | `.codex/rules/read-only-trace-ref-standard.md` |
| secrets-never-commit | `.codex/rules/secrets-never-commit.md` |
| smoke-chat-id-isolation | `.codex/rules/smoke-chat-id-isolation.md` |
| test-failure-priority-gate | `.codex/rules/test-failure-priority-gate.md` |
| token-efficiency-codex | `.codex/rules/token-efficiency-codex.md` |

## Agents

| Agent | Path |
|---|---|
| README | `.github/agents/README.md` |
| architect.agent | `.github/agents/architect.agent.md` |
| ops-hardening.agent | `.github/agents/ops-hardening.agent.md` |
| runtime-reviewer.agent | `.github/agents/runtime-reviewer.agent.md` |

## Instructions

| Instruction | Path |
|---|---|
| conventional-commits.instructions | `.github/instructions/conventional-commits.instructions.md` |
| external-integrations-safety.instructions | `.github/instructions/external-integrations-safety.instructions.md` |
| meta-chatmode.instructions | `.github/instructions/meta-chatmode.instructions.md` |
| meta-instructions.instructions | `.github/instructions/meta-instructions.instructions.md` |
| spec-first-workflow.instructions | `.github/instructions/spec-first-workflow.instructions.md` |
| validation-and-testing.instructions | `.github/instructions/validation-and-testing.instructions.md` |

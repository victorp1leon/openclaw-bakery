# C4 / Architecture Completeness Checklist (OpenClaw Bakery Bot)

Status: MVP
Last Updated: 2026-02-26

Use this checklist to review whether the documentation is complete enough to:
- generate reliable C4 diagrams,
- implement/refactor safely,
- operate the bot in production,
- and onboard another developer without reverse-engineering the code.

## Current Snapshot (2026-02-26)

This file is being used as a live checklist for the current repository state.
Checked items reflect what is already documented/covered today; unchecked items are gaps or areas that need stronger documentation.

## 1) C4 Structure (Minimum Required)

- [x] `overview` exists and explains purpose in plain language (`documentation/bot-bakery.overview.md`)
- [x] `system.description.md` exists and matches current containers
- [x] Each container in C4 Level 2 has a `component.description.md`
- [x] Each component listed in a `component.description.md` has a corresponding `*.spec.md` (or is explicitly marked "inlined in another component")
- [x] `c4-instructions-*.md` references existing files only (no broken paths)
- [x] C4 names are consistent across L1/L2/L3 (same container/component names)
- [x] Diagram prompt template path is valid and current

## 2) Component Coverage (Repo-Specific)

### Required Containers (current system)
- [x] Channels
- [x] Conversation Runtime
- [x] OpenClaw Runtime Adapter
- [x] State & Persistence
- [x] Tool Adapters
- [x] Config & Healthcheck

### Conversation Runtime (L3 focus)
- [x] `conversationProcessor`
- [x] `allowlistGuard`
- [x] `intentRouter`
- [x] `parser`
- [x] `validationGuard`
- [x] `missingFieldPicker`
- [x] `confirmationGuard`
- [x] `dedupeGuard`
- [x] `toolExecutor` (or equivalent orchestration block, explicitly documented as inlined)
- [x] `stateStore` / operations persistence integration expectations

## 3) Spec Quality (Definition of Done per `*.spec.md`)

- [x] Objective states what the component does and what it must not do
- [x] Inputs/outputs or contract shape are documented
- [x] Business rules are explicit (not implied by code)
- [x] Error handling is classified (retriable/non-retriable when applicable)
- [x] Security constraints are stated (redaction, allowlist, confirmation gate, etc.)
- [x] Idempotency/dedupe behavior is specified where actions can repeat
- [x] Minimum test cases are listed with stable names
- [x] Spec clearly marks `MVP`, `stub`, or `future` behavior if not fully implemented

## 4) Conversation App Specific Completeness (Important)

- [x] Conversation state model documented (pending, missing fields, asked field, confirmed/canceled/completed)
- [x] Conversation state transitions documented (state machine or transition table)
- [x] Confirmation protocol documented (`confirmar` / `cancelar`, variants, ambiguity handling)
- [x] "One missing field per turn" behavior documented
- [x] Dedupe window vs idempotency (`operation_id`) documented separately
- [x] Fallback behavior documented for transient OpenClaw failures
- [x] User-visible error messaging policy documented (safe, non-leaky)

## 5) Integration / Tooling Completeness

- [x] Every tool adapter has its own spec (`append-expense`, `append-order`, `create-card`, `publish-site`)
- [x] Input/output contract per tool documented
- [x] Timeout and retry policy documented per tool
- [x] Idempotency strategy documented per tool (`operation_id`, downstream support)
- [x] External error mapping documented (4xx/5xx/network/timeout)
- [x] Dry-run behavior documented (if supported)

## 6) Operations / Reliability Docs (Recommended but High Value)

- [x] Config matrix (`ENV VAR` -> default -> required -> effect)
- [x] Startup/healthcheck behavior documented (fail/warn/ok criteria)
- [x] Logging/trace event catalog documented (event names + fields)
- [x] Runbook for common failures (Telegram down, LM Studio down, invalid JSON, DB locked)
- [x] SQLite backup/restore notes
- [x] Migration strategy/versioning notes
- [x] Deployment/network topology notes (VM, host-only LM Studio endpoint, secrets location)

## 7) Security / Compliance Baseline

- [x] Threat model (lightweight STRIDE is enough for MVP)
- [x] Secret handling and redaction rules documented
- [x] Allowlist enforcement point documented and tested
- [x] Confirmation gate before any external action documented and tested
- [x] Auditability requirements documented (`operation_id`, traceability)
- [x] Sensitive payload logging policy documented

## 8) Testing & Traceability

- [x] Spec-to-test traceability exists (at least by test case names)
- [x] Unit tests cover all guards
- [x] Integration tests cover channel + runtime + state path
- [x] Error-path tests exist for transient/non-transient OpenClaw failures
- [x] Idempotency/dedupe regression tests exist

## 9) Documentation Governance (Recommended)

- [x] Each doc includes status: `Draft` / `MVP` / `Stable`
- [x] Each doc has "last updated" date (optional but useful)
- [x] Glossary exists for domain terms (e.g., `gasto`, `pedido`, `tipo_envio`)
- [x] ADRs exist for key decisions (OpenClaw, LM Studio, SQLite, long polling, confirm gate)

## Review Cadence

- Before generating diagrams: Sections 1-3 must pass.
- Before production use: Sections 1-8 should pass.
- After each feature/tool added: update Sections 2, 5, and 8 in the same PR.

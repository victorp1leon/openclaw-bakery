# Intent Delivery Checklist (Phase 3+)

## 1) Scope + Contract
- [ ] Intent type defined: `read-only` or `mutation`
- [ ] Inputs/outputs and deterministic errors listed
- [ ] Acceptance criteria and rollback strategy documented

## 2) Spec-First Docs
- [ ] Tool spec created/updated in `documentation/c4/ComponentSpecs/Tools/Specs/`
- [ ] Runtime spec updated in `documentation/c4/ComponentSpecs/ConversationRuntime/Specs/conversation-processor.spec.md`
- [ ] Coverage/roadmap docs updated:
  - [ ] `documentation/ai_implementation/ddd-roadmap-coverage-matrix.md`
  - [ ] `documentation/bot-bakery.roadmap.md`
  - [ ] `documentation/ai_collaboration/system-map.md` (if flow changed)

## 3) Code Wiring
- [ ] Tool implementation in `src/tools/**`
- [ ] Runtime routing in `src/runtime/conversationProcessor.ts`
- [ ] Persona prompt updates in `src/runtime/persona.ts` (if needed)
- [ ] Bootstrap wiring in `src/index.ts` (if needed)

## 4) Tests
- [ ] Tool tests in `src/tools/**.test.ts`
- [ ] Runtime tests in `src/runtime/conversationProcessor.test.ts`
- [ ] Mutation-specific tests (confirm/cancel/idempotency)

## 5) Smoke Coverage (Mandatory for New Intents)
- [ ] Smoke script created in `scripts/smoke/`
- [ ] NPM script added in `package.json`
- [ ] Scenario added in `scripts/tests/generate-smoke-integration-summary.ts`
- [ ] Mock-safe env defaults configured (`SMOKE_*_LIVE=0`, `*_DRY_RUN=1` when needed)

## 6) Validation Commands
- [ ] Focused unit: `npm test -- <touched-tests> --run`
- [ ] Smoke summary: `npm run test:smoke-integration:summary`
- [ ] Security scan (when applies): `npm run security:scan`

## 7) Collaboration Closure
- [ ] Plan updated/created
- [ ] `_index.md` updated
- [ ] Session handoff created

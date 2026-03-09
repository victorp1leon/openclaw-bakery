---
applyTo: '**/*'
description: Enforce OpenClaw Bakery spec-first workflow before code changes, including roadmap, C4/spec updates, and test derivation.
---

# Spec-First Workflow Instruction

## Purpose
Keep implementation aligned with project architecture and contracts by applying spec-first delivery rules on every non-trivial change.

## Rules
- Treat `documentation/ai_implementation/implementation-instructions.md` as mandatory process baseline.
- Before coding any non-trivial feature, update the relevant docs in this order:
  1. `documentation/bot-bakery.roadmap.md` when scope or priority changes.
  2. `documentation/c4/ComponentSpecs/system.description.md` when architecture changes.
  3. The affected `component.description.md` file.
  4. The affected `*.spec.md` files including test cases.
- Implement code only after spec updates are defined.
- Derive tests from documented spec cases.
- If validation (tests/lint/smoke) cannot be executed, state the limitation explicitly in the delivery summary.

## Best Practices
- Keep changes small and verifiable.
- Prefer incremental contract changes over broad rewrites.
- Maintain traceability between spec updates and implementation files.

## References
- `AGENTS.md`
- `documentation/ai_implementation/implementation-instructions.md`
- `documentation/c4/README.md`

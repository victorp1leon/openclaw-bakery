---
applyTo: '**/*'
description: Define testing and validation expectations for OpenClaw Bakery changes, including targeted tests and explicit reporting of validation gaps.
---

# Validation And Testing Instruction

## Purpose
Ensure behavior changes are validated with reproducible checks and clear reporting.

## Rules
- If business logic changes, add or update automated tests in the affected module.
- Prefer targeted test execution first, then broader suite execution when relevant.
- Include at least one validation command for non-trivial changes.
- Summarize validation results in delivery notes (pass/fail/blocked).
- If tests cannot run, document why and what risk remains.

## Validation Flow
1. Identify impacted modules and existing tests.
2. Add/adjust tests based on updated specs.
3. Run focused test commands for touched behavior.
4. Run extra checks only when they add confidence (`lint`, `typecheck`, smoke tests).
5. Report outcomes and known gaps.

## Best Practices
- Avoid hidden behavior changes without tests.
- Keep tests deterministic and fast when possible.
- Use dry-run/simulated paths for flows that depend on external systems.

## References
- `documentation/ai_implementation/implementation-instructions.md`
- `documentation/operations/runbook-common-failures.md`

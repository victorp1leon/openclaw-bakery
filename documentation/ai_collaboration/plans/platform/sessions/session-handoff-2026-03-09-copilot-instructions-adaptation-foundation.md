# Session Handoff: Copilot Instructions Adaptation Foundation - 2026-03-09

> **Plan:** `documentation/ai_collaboration/plans/platform/implementation/copilot-instructions-adaptation-foundation.md`
> **Date:** `2026-03-09`
> **Owner:** `Codex + Dev`

## What Was Done
- Se creo capa inicial de instrucciones en `.github/instructions/` con 4 archivos:
  - `spec-first-workflow.instructions.md`
  - `validation-and-testing.instructions.md`
  - `external-integrations-safety.instructions.md`
  - `conventional-commits.instructions.md`
- Se creo template reutilizable de skills: `skills/_template/SKILL.md`.
- Se migraron `skills/order.create/SKILL.md` y `skills/expense.add/SKILL.md` a formato estandar con frontmatter y secciones de uso/alcance/seguridad.
- Se actualizo `plans/_index.md` y se marco el plan como completo.

## Current State
- Existe baseline para adaptar flujo tipo Copilot en este repo sin dependencia de contenido C#.
- Skills locales ya usan una estructura mas consistente y facil de evolucionar.

## Open Issues
- Falta definir si se incorporaran agentes locales equivalentes (ej. `architect`, `runtime-reviewer`) en una carpeta dedicada.
- Falta decidir si se empaquetara esta base en formato plugin/collection interno para onboarding.

## Next Steps
1. Evaluar adopcion de `agents/` internos con un caso concreto de uso.
2. Definir una convencion de `collections/` o manifest interno para bundles de instrucciones+skills.
3. Aplicar template a futuras skills de roadmap (phase 3+).

## Key Decisions
- Se adaptaron patrones de estructura y gobernanza, no contenido C#/.NET.
- Se mantuvo enfoque spec-first y seguridad-first ya existente en OpenClaw Bakery.

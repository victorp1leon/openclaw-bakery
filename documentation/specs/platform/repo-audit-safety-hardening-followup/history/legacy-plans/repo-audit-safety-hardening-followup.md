# Repo Audit Safety Hardening Follow-up

> **Type:** `Implementation`
> **Status:** `Complete`
> **Created:** `2026-03-13`
> **Last Updated:** `2026-03-13`

## Cross-References
| Documento | Ruta | Uso |
|---|---|---|
| Audit skill base | `.codex/skills/repo-audit-safety/SKILL.md` | Flujo operativo de auditoría |
| Audit checklist base | `.codex/skills/repo-audit-safety/references/audit-checklist.md` | Checklist reusable de diagnóstico |
| Audit prompt base | `.codex/audit-prompt.md` | Prompt de auditoría safety-first |
| Approval gates | `AGENTS.md` | Regla de aprobación explícita (`apruebo`) |

## Contexto
Durante una auditoría no mutante en `src/runtime` y `.codex`, se detectaron hallazgos de bajo riesgo en el tooling de auditoría: ruido por falsos positivos de `TODO/FIXME`, inconsistencia menor entre patrones de búsqueda, y acoplamiento a ruta absoluta local en el prompt.

## Alcance
### In Scope
- Reducir falsos positivos en el scan de `repo-audit-safety`.
- Unificar patrón de detección de placeholders entre skill y checklist.
- Mejorar portabilidad de `.codex/audit-prompt.md`.
- Cerrar artefactos de colaboración (plan/index/handoff).

### Out of Scope
- Cambios funcionales en `src/runtime`.
- Cambios en integración live o flujos de negocio.

## Approach
| # | Paso | Estado | Notas |
|---|---|---|---|
| 1 | Crear plan de follow-up | Completed | Plan iniciado con aprobación explícita del usuario |
| 2 | Ajustar comando de scan en skill | Completed | Se separó scan de placeholders y scan de `TODO/FIXME` solo en superficies de producto |
| 3 | Alinear checklist/prompt | Completed | Checklist y prompt ajustados para consistencia y portabilidad |
| 4 | Validar y cerrar docs | Completed | `quick_validate.py` OK + cierre de artefactos |

## Decisions & Trade-offs
| Decision | Rationale | Date |
|---|---|---|
| Priorizar reducción de ruido sobre ampliar checks | Mejora señal/ruido sin introducir riesgo operativo | 2026-03-13 |

## Validation
- Checks a ejecutar:
  - `python3 .codex/skills/skill-creator/scripts/quick_validate.py .codex/skills/repo-audit-safety`
  - `rg -n "YOUR/OPENCLAW/FOLDER/HERE|/workspace|\\[.*OPENCLAW.*\\]" .codex/skills/repo-audit-safety .codex/audit-prompt.md`
- Criterio de aceptacion:
  - Skill/checklist consistentes y sin patrón ruidoso innecesario.
  - Prompt portable sin perder contexto del repo.

## Outcome
Se endureció el flujo de auditoría sin tocar runtime productivo: la skill `repo-audit-safety` ahora evita falsos positivos de scaffold al separar el scan de placeholders del scan de `TODO/FIXME` en superficies de producto. Se alineó el checklist con el mismo criterio y se volvió más portable el prompt base al referenciar la raíz actual del repositorio con ejemplo local.

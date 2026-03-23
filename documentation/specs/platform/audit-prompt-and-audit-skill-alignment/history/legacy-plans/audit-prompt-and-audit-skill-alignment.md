# Audit Prompt and Audit Skill Alignment

> **Type:** `Implementation`
> **Status:** `Complete`
> **Created:** `2026-03-13`
> **Last Updated:** `2026-03-13`

## Cross-References
| Documento | Ruta | Uso |
|---|---|---|
| Operational guardrails | `AGENTS.md` | Reglas base de colaboracion y aprobaciones |
| Audit prompt base | `.codex/audit-prompt.md` | Prompt a alinear al proyecto real |
| Local rules catalog | `.codex/rules/README.md` | Guardrails locales activos |
| Approval keyword gate | `.codex/rules/approval-keyword-gate.md` | Requisito de `apruebo` para implementar/commitear |
| Skill creation guide | `.codex/skills/skill-creator/SKILL.md` | Patron para crear skill reusable |

## Contexto
El prompt de auditoria actual contiene rutas/placeholders genericos y no incorpora completamente los guardrails activos del repositorio. Ademas, no existe una skill dedicada para ejecutar auditorias de forma consistente y segura.

## Alcance
### In Scope
- Adaptar `.codex/audit-prompt.md` a rutas reales del repositorio y al flujo operativo actual.
- Crear una nueva skill en `.codex/skills/` para auditorias safety-first.
- Validar estructura minima de la skill con `quick_validate.py`.
- Cerrar artefactos de colaboracion (`_index.md` y handoff de sesion).

### Out of Scope
- Cambios funcionales en runtime (`src/`) o integraciones externas.
- Enforcement CI automatico de reglas de auditoria.

## Approach
| # | Paso | Estado | Notas |
|---|---|---|---|
| 1 | Levantar contexto y guardrails aplicables | Completed | Revisados `AGENTS.md`, rules locales, system-map, plan index y handoff relacionado |
| 2 | Adaptar `audit-prompt.md` a rutas/guardrails del repo | Completed | Prompt actualizado con paths reales, flujo obligatorio y safety gates locales |
| 3 | Crear skill de auditoria (`SKILL.md` + `agents/openai.yaml` + referencia) | Completed | Skill `repo-audit-safety` creada en `.codex/skills/` |
| 4 | Validar skill y consistencia de contenido | Completed | `quick_validate.py` retorno `Skill is valid!` |
| 5 | Cerrar docs de colaboracion | Completed | Plan/index/handoff sincronizados |

## Decisions & Trade-offs
| Decision | Rationale | Date |
|---|---|---|
| Separar prompt y skill | El prompt sirve como plantilla directa; la skill estandariza ejecucion recurrente | 2026-03-13 |
| Incluir checklist en `references/` | Mantiene `SKILL.md` compacto y permite auditoria progresiva con contexto bajo demanda | 2026-03-13 |

## Validation
- Tests a ejecutar:
  - `python3 .codex/skills/skill-creator/scripts/quick_validate.py .codex/skills/repo-audit-safety`
- Criterio de aceptacion:
  - Prompt actualizado con rutas reales y guardrails del repo.
  - Skill creada y validada.
  - Plan/index/handoff consistentes.

## Outcome
Se adapto `.codex/audit-prompt.md` al contexto real de OpenClaw Bakery (rutas, guardrails y policy de aprobacion). Se creo la skill `.codex/skills/repo-audit-safety` con metadata `agents/openai.yaml` y checklist reusable en `references/audit-checklist.md`. La skill fue validada exitosamente con `quick_validate.py`.

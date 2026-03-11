# Codex Skills & Rules Acceleration Foundation

> **Type:** `Implementation`
> **Status:** `Complete`
> **Created:** `2026-03-11`
> **Last Updated:** `2026-03-11`

## Cross-References
| Documento | Ruta | Uso |
|---|---|---|
| AGENTS baseline | `AGENTS.md` | Reglas operativas de colaboracion |
| Collaboration playbook | `documentation/ai_collaboration/codex-collaboration-playbook.md` | Flujo research/plan/implement/close |
| Active runtime plan | `documentation/ai_collaboration/plans/runtime/implementation/phase3-order-lifecycle-skills-spec-first.md` | Prioridades funcionales actuales |
| Skills codex locales | `.codex/skills/` | Automatizacion de workflows recurrentes |

## Contexto
El repositorio ya cuenta con skills iniciales para `unit`, `smoke/integration` y `commit`, pero faltaba completar el set recomendado para acelerar el ciclo de entrega y reducir errores operativos en live. Tambien faltaba un baseline formal de reglas locales de Codex alineadas al modelo operativo del bot (GWS-only, dual-write y seguridad de secretos).

## Alcance
### In Scope
- Completar skills faltantes recomendadas para flujo de desarrollo:
  - `docs-plan-handoff`
  - `release-check`
- Formalizar reglas locales en `.codex/rules/` para:
  - GWS-only
  - dual-write strict en pedidos
  - gating de live por flags explicitos
  - validacion minima obligatoria por tipo de cambio
  - exclusion de secretos en commits
- Actualizar `AGENTS.md` para descubrimiento de reglas locales.
- Cerrar artefactos de colaboracion (`_index.md` + handoff).

### Out of Scope
- Cambios de runtime funcional en `src/`.
- Refactor de skills productivas de dominio (`skills/*`).
- Automatizacion CI de enforcement (se mantiene en reglas operativas/documentales).

## Approach
| # | Paso | Estado | Notas |
|---|---|---|---|
| 1 | Definir plan y convencion de ubicacion para reglas locales | Completed | Se adopta `.codex/rules/` |
| 2 | Implementar skills `docs-plan-handoff` y `release-check` | Completed | Se agregaron skills + `agents/openai.yaml` |
| 3 | Implementar baseline de reglas en `.codex/rules/` | Completed | 5 reglas operativas + `README.md` |
| 4 | Integrar descubrimiento en `AGENTS.md` | Completed | Seccion `Codex Local Scaffolding` agregada |
| 5 | Cierre documental y validacion de skills | Completed | `quick_validate` OK, `_index.md` y handoff actualizados |

## Decisions & Trade-offs
| Decision | Rationale | Date |
|---|---|---|
| Ubicar reglas en `.codex/rules/` | Mantiene todo el scaffolding de agente en un namespace unico y local al repo | 2026-03-11 |
| Mantener enforcement como guardrails operativos | Evita introducir complejidad de tooling/CI en esta iteracion | 2026-03-11 |
| Priorizar skills de cierre y release quality | Son cuellos de botella frecuentes en sesiones multi-cambio | 2026-03-11 |

## Validation
- Checks a ejecutar:
  - `python3 /home/victor/.codex/skills/.system/skill-creator/scripts/quick_validate.py .codex/skills/docs-plan-handoff`
  - `python3 /home/victor/.codex/skills/.system/skill-creator/scripts/quick_validate.py .codex/skills/release-check`
  - `find .codex/rules -maxdepth 2 -type f | sort`
- Criterio de aceptacion:
  - Skills faltantes creadas y validas.
  - Baseline de reglas locales disponible y referenciado por `AGENTS.md`.
  - Artefactos de colaboracion actualizados.

## Outcome
Se completo el baseline local de aceleracion para Codex:
- Skills nuevas: `docs-plan-handoff`, `release-check`.
- Reglas locales: `gws-only`, `order-dual-write-strict`, `live-flags-gate`, `mandatory-validation`, `secrets-never-commit`.
- Descubrimiento integrado en `AGENTS.md`.

# Code Review Graph Workflow Gate Adoption v1

> **Type:** `Implementation`
> **Status:** `Complete`
> **Created:** `2026-03-24`
> **Last Updated:** `2026-03-24`

## Cross-References
| Documento | Ruta | Uso |
|---|---|---|
| Flujo canonico | `documentation/ai_collaboration/spec-driven-flow-v1.md` | Integrar CRG en etapas oficiales Discover/Implement/Validate |
| Checklist operativo CRG | `documentation/ai_collaboration/references/operations/code-review-graph-gate-checklist.md` | Ejecucion diaria y evidencia minima |
| Integracion CRG base | `documentation/ai_collaboration/plans/platform/implementation/code-review-graph-integration-spec-driven-v1.md` | Contexto de capacidades ya implementadas |
| Rule local Codex | `.codex/rules/code-review-graph-impact-gate.md` | Aplicacion consistente por defecto en tareas elegibles |

## Contexto
CRG ya estaba integrado tecnicamente, pero faltaba institucionalizar su uso recurrente en el flujo de desarrollo. El objetivo de esta adopcion es convertir CRG en gate operativo liviano para reducir review a ciegas, priorizar pruebas por impacto real y mejorar consistencia entre sesiones.

## Alcance
### In Scope
- Definir checklist reusable de gate CRG para Discover/Implement/Validate.
- Actualizar flujo canonico para incluir la secuencia minima CRG cuando aplique.
- Incorporar regla local de uso por defecto en tareas elegibles.
- Cerrar trazabilidad (plan/index/handoff + registry sincronizado).

### Out of Scope
- Cambios al runtime CRG ya implementado.
- Forzar CRG en tareas documentales o cuando este deshabilitado.
- Automatizacion CI obligatoria en este paso.

## Approach
| # | Paso | Estado | Notas |
|---|---|---|---|
| 1 | Definir politica operativa CRG (activacion, umbrales, evidencia) | Complete | Checklist nuevo en `references/operations` |
| 2 | Integrar CRG gate al flujo canonico spec-driven | Complete | Seccion dedicada en `spec-driven-flow-v1.md` |
| 3 | Publicar regla local Codex para aplicacion consistente | Complete | `.codex/rules/code-review-graph-impact-gate.md` |
| 4 | Sincronizar hubs/indices/handoff y cerrar adopcion | Complete | `ai_collaboration/README.md`, `plans/_index.md`, handoff final |

## Decisions & Trade-offs
| Decision | Rationale | Date |
|---|---|---|
| Gate CRG liviano en 3 puntos (build/impact/context) | Minimiza friccion y maximiza adopcion diaria | 2026-03-24 |
| CRG solo "when enabled" y por criterios de activacion | Evita bloqueo en docs-only o entornos sin CRG disponible | 2026-03-24 |
| Umbrales de impacto para escalar validacion | Convierte output CRG en decision operativa concreta | 2026-03-24 |

## Validation
- Commands ejecutados:
  - `rg -n '^CODE_REVIEW_GRAPH_' .env .env.example` (config detectada)
  - ejecucion real de `build_or_update_graph`, `get_impact_radius`, `get_review_context` via tool CRG (ok)
  - `npm run codex:skill-registry` (sync de regla/skill registry)
- Criterio de aceptacion:
  - Existe checklist oficial CRG y referencia en flujo canonico.
  - Existe regla local para aplicacion consistente de CRG gate.
  - Artefactos de colaboracion quedan en estado consistente (`Complete`).

## Outcome
CRG queda incorporado de forma eficiente al flujo de desarrollo: uso recomendado por etapa, umbrales de escalamiento por impacto y evidencia minima de cierre. Con esto, Codex puede usar CRG de forma sistematica en futuros desarrollos y revisiones.

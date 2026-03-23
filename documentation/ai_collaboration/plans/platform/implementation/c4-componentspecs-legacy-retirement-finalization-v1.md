# C4 ComponentSpecs Legacy Retirement Finalization v1

> **Type:** `Implementation`
> **Status:** `Complete`
> **Created:** `2026-03-23`
> **Last Updated:** `2026-03-23`

## Cross-References
| Documento | Ruta | Uso |
|---|---|---|
| Plan maestro de migracion SDD | `documentation/ai_collaboration/plans/platform/implementation/sdd-migration-documentation-reorganization-master-plan-v1.md` | Base de estado actual (C4 migrado y verificado) |
| Handoff cierre plan maestro (Step 11) | `documentation/ai_collaboration/plans/platform/sessions/session-handoff-2026-03-23-sdd-migration-doc-reorg-master-plan-step11-administrative-closure-final.md` | Evidencia de cierre 117/117 |
| Manifiesto de migracion | `documentation/specs/migration-manifest.md` | Registro oficial de entradas C4-001..C4-039 |
| Contratos canonicos | `documentation/specs/contracts/components/` | Destino definitivo de contratos |
| C4 README | `documentation/c4/README.md` | Regla post-retiro: C4 orientado a arquitectura (sin contratos duplicados) |

## Contexto
La migracion documental ya movio y verifico 39 contratos C4 en `documentation/specs/contracts/components/**`, pero los archivos legacy `documentation/c4/ComponentSpecs/*/Specs/*.spec.md` seguian como referencia temporal. Este plan define la fase final para retirar esa duplicidad y dejar una sola fuente contractual activa.

## Alcance
### In Scope
- Retirar contratos legacy `ComponentSpecs/*/Specs/*.spec.md` de `documentation/c4/`.
- Mantener C4 para arquitectura (`system.description.md` y `component.description.md`), sin contratos duplicados.
- Actualizar referencias/documentacion para declarar `documentation/specs/contracts/components/**` como unica fuente contractual.
- Ajustar trazabilidad (`migration-manifest`, plan/index/handoff) para que el retiro no rompa validaciones futuras.

### Out of Scope
- Cambios en runtime, tools o integraciones.
- Cambios de comportamiento funcional en contratos canonicos.
- Reescribir historial de handoffs legacy.

## Approach
| # | Paso | Estado | Notas |
|---|---|---|---|
| 1 | Inventariar referencias activas a `documentation/c4/ComponentSpecs/*/Specs/*.spec.md` | Complete | Referencias clasificadas (activas, historicas y trazas en manifiesto) |
| 2 | Definir politica de trazabilidad post-retiro en `migration-manifest.md` | Complete | Agregadas regla C.2 y politica post-retiro para `Source Path` historico |
| 3 | Actualizar docs operativas/C4 para fuente contractual unica | Complete | Actualizados `documentation/c4/README.md`, `documentation/c4/ComponentSpecs/system.description.md`, `documentation/c4/c4-instructions-bot-bakery.md` y referencias activas relacionadas |
| 4 | Retirar archivos legacy de contratos C4 | Complete | Eliminados 39 archivos `documentation/c4/ComponentSpecs/*/Specs/*.spec.md`; preservadas descripciones C4 de arquitectura |
| 5 | Ejecutar validacion integral documental y cerrar artefactos | Complete | Validacion documental `OK` + cierre plan/index/handoff |

## Decisions & Trade-offs
| Decision | Rationale | Date |
|---|---|---|
| Separar retiro legacy en plan dedicado | Evita mezclar cierre de migracion con limpieza destructiva posterior | 2026-03-23 |
| Mantener C4 solo para arquitectura | Preserva valor de diagramacion C4 sin doble fuente contractual | 2026-03-23 |

## Validation
- Verificaciones ejecutadas:
  - `find documentation/c4/ComponentSpecs -type f -path '*/Specs/*.spec.md' | wc -l` -> `0`
  - `find documentation/specs/contracts/components -type f -name '*.spec.md' | wc -l` -> `39`
  - `rg -uu -n "documentation/c4/ComponentSpecs/.*/Specs/.*\\.spec\\.md|c4/ComponentSpecs/.*/Specs/.*\\.spec\\.md|ComponentSpecs/\\*/Specs/\\*\\.spec\\.md|ComponentSpecs/\\*\\*/Specs/\\*\\.spec\\.md" .codex documentation --glob '!documentation/specs/migration-manifest.md' --glob '!documentation/ai_collaboration/plans/platform/implementation/c4-componentspecs-legacy-retirement-finalization-v1.md' --glob '!documentation/ai_collaboration/plans/platform/sessions/session-handoff-2026-03-23-c4-componentspecs-legacy-retirement-finalization-v1-*.md' --glob '!documentation/c4/c4-instructions-bot-bakery.md'` -> sin hallazgos activos (solo trazas historicas excluidas)
  - `rg -n "C4-00[1-9]|C4-0[1-3][0-9]|C4-039" documentation/specs/migration-manifest.md` -> trazabilidad C4 preservada con nota de retiro C.2
- Criterio de aceptacion:
  - No quedan contratos duplicados activos en C4.
  - Contratos canonicos en `documentation/specs/contracts/components/**` permanecen completos y referenciados.
  - Trazabilidad documental permanece coherente para futuras auditorias.

## Outcome
Fase final ejecutada: se retiraron los contratos legacy de `documentation/c4/ComponentSpecs/*/Specs/*.spec.md`, se mantuvo C4 para arquitectura y se formalizo la politica de trazabilidad post-retiro en el manifiesto de migracion.

# Phase 3 - Quote Pricing Catalog Sheets Tab Foundation

> **Type:** `Implementation`
> **Status:** `Complete`
> **Created:** `2026-03-12`
> **Last Updated:** `2026-03-12`

## Cross-References
| Documento | Ruta | Uso |
|---|---|---|
| Roadmap | `documentation/bot-bakery.roadmap.md` | Backlog funcional de `quote.order` |
| DDD matrix | `documentation/ai_implementation/ddd-roadmap-coverage-matrix.md` | Estado de cobertura actual y siguiente accion |
| Config matrix | `documentation/operations/config-matrix.md` | Variables operativas para comandos/scripts |
| Tool spec | `documentation/specs/contracts/components/pricing-catalog-bootstrap.spec.md` | Contrato del bootstrap de pestaña de precios |
| Runtime system map | `documentation/ai_collaboration/system-map.md` | Contexto transversal de integraciones |

## Contexto
`quote.order` esta priorizado en Fase 3, pero aun no tiene fuente operativa de precios para cotizar de forma consistente. Se requiere fundacion operativa en Google Sheets mediante una pestaña dedicada al catalogo de precios, usando el mismo provider `gws`.

## Alcance
### In Scope
- Definir estructura inicial de catalogo de precios en una pestaña dedicada de Google Sheets.
- Agregar script reproducible para bootstrap (crear pestaña + headers + filas semilla).
- Mantener ejecucion segura por default (preview/dry-run) y modo apply explicito.
- Documentar variables y comando operativo.

### Out of Scope
- Implementacion completa de `quote.order` en runtime.
- Cambios a calculo final de cotizacion dentro de `conversationProcessor`.
- Migracion de catalogos legacy fuera de la nueva pestaña.

## Approach
| # | Paso | Estado | Notas |
|---|---|---|---|
| 1 | Definir esquema tabular inicial para catalogo de precios | Completed | Seccionado por `kind` (`PRODUCT`, `EXTRA`, `SHIPPING`, `URGENCY`, `POLICY`) |
| 2 | Implementar script de bootstrap sobre `gws` | Completed | `scripts/sheets/init-pricing-catalog-tab.ts` crea pestaña y escribe seed table |
| 3 | Exponer comando npm y flags operativos | Completed | `npm run sheets:pricing:init` + flags `PRICING_CATALOG_*` |
| 4 | Actualizar docs operativas (config matrix) | Completed | Variables y comandos de bootstrap agregados |
| 5 | Validar ejecucion local en modo seguro | Completed | Preview local ejecutado sin mutacion |
| 6 | Cierre documental (plan/index/handoff) | Completed | Plan cerrado + indice/handoff actualizados |

## Decisions & Trade-offs
| Decision | Rationale | Date |
|---|---|---|
| Bootstrap por script (no manual-only) | Repetible, auditable y consistente entre sesiones/equipos | 2026-03-12 |
| Modo seguro por default (preview) | Evitar mutaciones accidentales en hojas productivas | 2026-03-12 |
| Reusar `gws` actual | Mantener regla `gws-only` sin nuevos providers | 2026-03-12 |

## Validation
- Tests a ejecutar:
  - `npm run sheets:pricing:init` (modo preview/default)
  - `PRICING_CATALOG_APPLY=1 npm run sheets:pricing:init` (live apply)
- Criterio de aceptacion:
  - El comando renderiza preview sin ejecutar mutacion externa por default.
  - En modo apply, el script intenta crear pestaña y sembrar estructura via `gws`.
  - Variables/documentacion quedan trazables en `config-matrix`.

## Outcome
Se implemento y ejecuto bootstrap real de la pestaña `CatalogoPrecios` en Google Sheets con filas semilla para `PRODUCT/EXTRA/SHIPPING/URGENCY/POLICY`. El comando quedo idempotente por default (si la pestaña ya contiene datos, hace `skip` salvo `PRICING_CATALOG_OVERWRITE=1`).

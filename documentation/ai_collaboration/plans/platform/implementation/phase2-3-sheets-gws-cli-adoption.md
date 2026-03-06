# Phase 2-3 Sheets GWS CLI Adoption

> **Type:** `Implementation`
> **Status:** `Complete`
> **Created:** `2026-03-05`
> **Last Updated:** `2026-03-05`

## Cross-References
| Documento | Ruta | Uso |
|---|---|---|
| Roadmap | `documentation/bot-bakery.roadmap.md` | Alineacion de alcance por fases |
| System description | `documentation/c4/ComponentSpecs/system.description.md` | Contexto de arquitectura de contenedores |
| Tools component | `documentation/c4/ComponentSpecs/Tools/component.description.md` | Reglas de adapters de integracion |
| Expense spec | `documentation/c4/ComponentSpecs/Tools/Specs/append-expense.spec.md` | Contrato `expense.add` |
| Order spec | `documentation/c4/ComponentSpecs/Tools/Specs/append-order.spec.md` | Contrato `order.create` Sheets |
| Config source | `src/config/appConfig.ts` | Variables/env y defaults operativos |
| Connectors source | `src/tools/expense/appendExpense.ts`, `src/tools/order/appendOrder.ts` | Implementacion runtime de Sheets |

## Contexto
La integracion a Google Sheets esta operativa via Apps Script Web App con webhook y API key, pero se quiere adoptar `googleworkspace/cli` para habilitar una ruta mas directa para agentes y operaciones. El riesgo principal es introducir regresiones en flujos live ya validados (`expense.add` y `order.create`) y en controles de seguridad/retry actuales. Se implementara un enfoque incremental con provider toggle para mantener continuidad operativa.

## Alcance
### In Scope
- Introducir provider de Sheets configurable (`apps_script` o `gws`) para gasto y pedido.
- Implementar cliente de ejecucion `gws` con timeout y errores sanitizados.
- Mantener comportamiento existente de Apps Script como ruta estable.
- Actualizar tests, healthcheck y smoke scripts para reflejar validaciones por provider.
- Actualizar documentacion spec-first y tracking de colaboracion.

### Out of Scope
- Reemplazar completamente Apps Script en esta fase.
- Cambiar el contrato conversacional (`confirmar/cancelar`, dedupe runtime).
- Implementar nuevas skills (`order.update`, `order.cancel`, etc.).

## Approach
| # | Paso | Estado | Notas |
|---|---|---|---|
| 1 | Actualizar artefactos spec-first y registrar plan activo | Completed | Plan + index activados y specs base actualizadas |
| 2 | Extender config para provider y parametros `gws` | Completed | `expense` y `order.sheets` soportan provider + `gws` envs |
| 3 | Implementar cliente `gws` y enrutar adapters de Sheets por provider | Completed | Nuevo runner CLI y adapters duales con retry/timeout |
| 4 | Ajustar healthcheck/smoke/tests para ambos providers | Completed | Health + smoke + unit tests actualizados |
| 5 | Ejecutar tests focalizados y cerrar artefactos de colaboracion | Completed | Suite focalizada en verde; handoff pendiente en este cierre |

## Decisions & Trade-offs
| Decision | Rationale | Date |
|---|---|---|
| Adoptar `gws` como provider opcional, no reemplazo inmediato | Minimiza riesgo operacional y permite rollout controlado | 2026-03-05 |
| Mantener Apps Script como default | Los flujos live actuales ya estan validados y monitoreados | 2026-03-05 |
| Preservar contrato de tool (`operation_id`, `dry_run`, retries bounded) | Evita cambios aguas arriba en runtime y estado | 2026-03-05 |

## Validation
- Tests a ejecutar:
  - `npm test -- src/tools/expense/appendExpense.test.ts src/tools/order/appendOrder.test.ts src/config/appConfig.test.ts src/health/healthcheck.test.ts`
- Criterio de aceptacion:
  - Provider `apps_script` conserva comportamiento previo.
  - Provider `gws` se puede activar por env sin romper compile/tests.
  - Healthcheck refleja prerequisitos por provider y dry-run.

## Outcome
Se implemento adopcion incremental de `googleworkspace/cli` via provider toggle en conectores de Sheets:
- `apps_script` se mantiene como default y ruta estable.
- `gws` queda disponible por configuracion para `expense.add` y `order.create`.
- Se actualizo config/runtime/health/smoke/tests y documentacion C4/roadmap/matriz DDD.
- Validacion ejecutada: tests focalizados passing (`39/39`).

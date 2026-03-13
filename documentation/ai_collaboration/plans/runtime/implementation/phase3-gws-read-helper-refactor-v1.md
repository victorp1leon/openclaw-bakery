# Phase 3 - gws read helper refactor v1

> **Type:** `Refactoring`
> **Status:** `Complete`
> **Created:** `2026-03-13`
> **Last Updated:** `2026-03-13`

## Cross-References
| Documento | Ruta | Uso |
|---|---|---|
| Plan previo | `documentation/ai_collaboration/plans/runtime/implementation/phase3-shopping-list-generate-v1.md` | Contexto de mejora detectada tras implementación |
| Tools C4 | `documentation/c4/ComponentSpecs/Tools/component.description.md` | Alineación de adapters read-only |
| Runtime map | `documentation/ai_collaboration/system-map.md` | Ubicación de módulos de tools/integraciones |

## Contexto
Se detectó duplicación de lógica para lectura read-only de Google Sheets (`gws values get`) en múltiples tools de pedidos. Esto elevaba costo de mantenimiento y riesgo de divergencia en retries/errores. El objetivo fue centralizar esta lógica en un helper reutilizable sin cambiar contratos funcionales.

## Alcance
### In Scope
- Crear helper compartido para normalización de rango y lecturas `gws` con retry.
- Refactorizar `reportOrders`, `lookupOrder`, `orderStatus` y `shoppingListGenerate` para usar el helper.
- Mantener errores/semántica existentes por tool.
- Ejecutar tests unitarios focalizados.

### Out of Scope
- Refactorizar tools write-path (`append`, `update`, `cancel`, `recordPayment`).
- Cambios de comportamiento en runtime o contratos de respuesta.
- Cambios en integraciones externas.

## Approach
| # | Paso | Estado | Notas |
|---|---|---|---|
| 1 | Diseñar helper compartido para `gws` read-only | Completed | Nuevo módulo `src/tools/googleWorkspace/gwsReadValues.ts` |
| 2 | Migrar tools de lectura a helper | Completed | 4 tools refactorizados sin cambios de contrato |
| 3 | Validar regresiones con tests focalizados | Completed | 26/26 tests en los 4 tools |
| 4 | Cerrar artefactos de colaboración | Completed | Plan + index + handoff actualizados |

## Decisions & Trade-offs
| Decision | Rationale | Date |
|---|---|---|
| Centralizar únicamente read-only `values get` | Reducir riesgo en esta iteración y preservar cambios acotados | 2026-03-13 |
| Mantener `retryOnUnknownError` configurable | Preservar diferencia histórica de `orderStatus` sin condicionales duplicados | 2026-03-13 |

## Validation
- Tests ejecutados:
  - `npm test -- src/tools/order/reportOrders.test.ts src/tools/order/lookupOrder.test.ts src/tools/order/orderStatus.test.ts src/tools/order/shoppingListGenerate.test.ts --run`
- Criterio de aceptación:
  - Tools read-only comparten helper sin degradar resultados ni códigos de error esperados.
  - Suite focalizada verde.

## Outcome
Refactor completado con helper compartido:
- Nuevo: `src/tools/googleWorkspace/gwsReadValues.ts`
- Migrados: `src/tools/order/reportOrders.ts`, `src/tools/order/lookupOrder.ts`, `src/tools/order/orderStatus.ts`, `src/tools/order/shoppingListGenerate.ts`
- Validación focalizada: 4 archivos de test, 26 pruebas en verde.

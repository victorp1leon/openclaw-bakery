# Phase 3 - inventory tabs bootstrap automation

> **Type:** `Implementation`
> **Status:** `Complete`
> **Created:** `2026-03-13`
> **Last Updated:** `2026-03-13`

## Cross-References
| Documento | Ruta | Uso |
|---|---|---|
| Inventory bootstrap script | `scripts/sheets/init-inventory-tabs.ts` | Creacion/actualizacion de tabs `Inventario` y `MovimientosInventario` |
| Shared helpers | `scripts/sheets/_shared/gws-bootstrap-utils.ts` | Reuso de invocacion/parsing `gws` |
| Config matrix | `documentation/operations/config-matrix.md` | Variables y comandos operativos del bootstrap |

## Contexto
Se detecto necesidad de automatizar la creacion y estandarizacion de tabs de inventario en Google Sheets para reducir pasos manuales y riesgo de errores de estructura antes de implementar `inventory.consume`.

## Alcance
### In Scope
- Script `preview/apply` para tabs de inventario.
- Comandos npm `sheets:inventory:init` y `sheets:inventory:preview`.
- Variables de entorno y documentacion operativa asociada.
- Actualizacion de artefactos de colaboracion (plan/index/handoff).

### Out of Scope
- Implementacion de `inventory.consume`.
- Seed de stock inicial o movimientos reales.
- Ejecucion `apply` live desde esta iteracion.

## Approach
| # | Paso | Estado | Notas |
|---|---|---|---|
| 1 | Crear script `init-inventory-tabs.ts` | Completed | Crea tabs faltantes + escribe headers con gate `INVENTORY_TABS_APPLY` |
| 2 | Exponer comandos npm seguros | Completed | `sheets:inventory:init` + `sheets:inventory:preview` |
| 3 | Actualizar docs/env | Completed | `.env.example`, `README`, `config-matrix` |
| 4 | Validar preview local | Completed | `npm run sheets:inventory:preview` |
| 5 | Cerrar artefactos de colaboracion | Completed | Plan + index + handoff actualizados |

## Decisions & Trade-offs
| Decision | Rationale | Date |
|---|---|---|
| Incluir dos tabs en un solo script | Asegura consistencia atomica del esquema base de inventario | 2026-03-13 |
| Mantener `preview` como default | Evita mutaciones accidentales en entorno live | 2026-03-13 |
| Reusar helpers `gws` compartidos | Reduce duplicacion y mantiene manejo de errores uniforme | 2026-03-13 |

## Validation
- `npm run sheets:inventory:preview`
- Criterio de aceptacion: salida en `mode: "preview"` con headers esperados para ambas tabs y sin escritura live.

## Outcome
Quedo disponible un bootstrap reusable para inventario:
- `scripts/sheets/init-inventory-tabs.ts`
- `npm run sheets:inventory:init`
- `npm run sheets:inventory:preview`
- Variables `INVENTORY_*` documentadas para operacion segura.

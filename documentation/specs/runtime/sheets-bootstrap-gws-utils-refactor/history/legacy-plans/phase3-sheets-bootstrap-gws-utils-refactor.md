# Phase 3 - sheets bootstrap gws utils refactor

> **Type:** `Refactoring`
> **Status:** `Complete`
> **Created:** `2026-03-13`
> **Last Updated:** `2026-03-13`

## Cross-References
| Documento | Ruta | Uso |
|---|---|---|
| Bootstrap pricing | `scripts/sheets/init-pricing-catalog-tab.ts` | Script afectado |
| Bootstrap recipes | `scripts/sheets/init-recipes-catalog-tab.ts` | Script afectado |
| Shared utils | `scripts/sheets/_shared/gws-bootstrap-utils.ts` | Modulo nuevo reutilizable |

## Contexto
Los scripts de bootstrap de catalogos (`pricing` y `recipes`) repetian la misma logica de parseo, invocacion `gws` y parseo de payload. Esto elevaba el costo de mantenimiento y riesgo de drift entre scripts.

## Alcance
### In Scope
- Extraer utilidades comunes `gws` a un modulo compartido.
- Actualizar ambos scripts para consumir el modulo.
- Verificar que ambos scripts sigan funcionando en modo `preview`.

### Out of Scope
- Cambios funcionales en payload seed o contratos de salida.
- Cambios en `shopping-list-generate`.
- Ejecuciones `apply` live como parte de validacion.

## Approach
| # | Paso | Estado | Notas |
|---|---|---|---|
| 1 | Crear modulo `_shared/gws-bootstrap-utils.ts` | Completed | Incluye parse helpers, invoker y parseo de responses |
| 2 | Refactor `init-pricing-catalog-tab.ts` | Completed | Reemplaza funciones locales duplicadas por imports compartidos |
| 3 | Refactor `init-recipes-catalog-tab.ts` | Completed | Reemplaza funciones locales duplicadas por imports compartidos |
| 4 | Validar scripts y tests focalizados | Completed | `sheets:pricing:init`, `sheets:recipes:init` (preview), tests verdes |

## Decisions & Trade-offs
| Decision | Rationale | Date |
|---|---|---|
| Centralizar invocacion `gws` + parseo de error | Mantener comportamiento consistente en ambos bootstraps | 2026-03-13 |
| Mantener modo default `preview` | Evitar escrituras accidentales durante validaciones | 2026-03-13 |

## Validation
- `npm run sheets:pricing:init`
- `RECIPES_CATALOG_APPLY=0 RECIPES_CATALOG_OVERWRITE=0 npm run sheets:recipes:init`
- `npm run test -- src/config/appConfig.test.ts src/tools/order/shoppingListGenerate.test.ts --run`

## Outcome
Refactor completado sin cambios funcionales visibles: ambos scripts ahora comparten la misma base utilitaria para `gws`, reduciendo duplicacion y mejorando mantenibilidad.

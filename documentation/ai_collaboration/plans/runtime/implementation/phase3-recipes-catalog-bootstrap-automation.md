# Phase 3 - recipes catalog bootstrap automation

> **Type:** `Implementation`
> **Status:** `Complete`
> **Created:** `2026-03-13`
> **Last Updated:** `2026-03-13`

## Cross-References
| Documento | Ruta | Uso |
|---|---|---|
| Shopping list spec | `documentation/specs/contracts/components/shopping-list-generate.spec.md` | Contrato del catalogo `CatalogoRecetas` |
| Config matrix | `documentation/operations/config-matrix.md` | Variables/env y comandos operativos del bootstrap |
| Script existente | `scripts/sheets/init-pricing-catalog-tab.ts` | Referencia de patron `preview/apply` para tabs Sheets |

## Contexto
`shopping.list.generate` ya soporta recetas en live via `CatalogoRecetas`, pero faltaba una automatizacion interna para crear/seedear esa hoja de forma segura y repetible. Se implemento un bootstrap dedicado para recetas con guardrails de apply explicito y overwrite opcional.

## Alcance
### In Scope
- Crear script `scripts/sheets/init-recipes-catalog-tab.ts`.
- Exponer comando `npm run sheets:recipes:init`.
- Documentar env vars/comandos de operacion.
- Actualizar artefactos de plan/index/handoff.

### Out of Scope
- Ejecutar escritura live en Google Sheets desde esta sesion.
- Modificar logica del tool `shopping-list-generate`.
- Agregar smoke live automatico para bootstrap.

## Approach
| # | Paso | Estado | Notas |
|---|---|---|---|
| 1 | Implementar bootstrap de recetas con modo preview/apply | Completed | Crea tab si no existe y seedea headers + filas ejemplo |
| 2 | Integrar script en `package.json` y `.env.example` | Completed | Se agrego `sheets:recipes:init` y vars `RECIPES_CATALOG_*` |
| 3 | Actualizar documentacion operativa | Completed | Config matrix + README con comandos |
| 4 | Validar compilacion/flujo local y tests focalizados | Completed | Preview local + tests de config/tool verdes |
| 5 | Cerrar artefactos de colaboracion | Completed | Plan, index y handoff actualizados |

## Decisions & Trade-offs
| Decision | Rationale | Date |
|---|---|---|
| Reusar patron de `init-pricing-catalog-tab.ts` | Mantiene consistencia operativa y reduce curva de uso | 2026-03-13 |
| Mantener `preview` como default | Evita escrituras accidentales en Google Sheets | 2026-03-13 |
| Seed inicial alineado a `DEFAULT_RECIPE_PROFILES` | Facilita continuidad entre smoke/mock y live catalog | 2026-03-13 |

## Validation
- `npm run sheets:recipes:init` (preview, sin mutacion externa).
- `npm run test -- src/config/appConfig.test.ts src/tools/order/shoppingListGenerate.test.ts --run`.
- Criterio de aceptacion: script ejecuta preview con payload valido y tests relacionados permanecen en verde.

## Outcome
Se agrego automatizacion para bootstrap de `CatalogoRecetas` con comando dedicado y documentacion operativa:
- `scripts/sheets/init-recipes-catalog-tab.ts`
- `npm run sheets:recipes:init`
- Variables `RECIPES_CATALOG_*` para apply/overwrite/targets/timeout.

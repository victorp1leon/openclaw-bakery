# Phase 3 - shopping.list.generate recipes gws live v1

> **Type:** `Implementation`
> **Status:** `Complete`
> **Created:** `2026-03-13`
> **Last Updated:** `2026-03-13`

## Cross-References
| Documento | Ruta | Uso |
|---|---|---|
| Tool spec | `documentation/specs/contracts/components/shopping-list-generate.spec.md` | Contrato del adapter `shopping-list-generate` |
| Config matrix | `documentation/operations/config-matrix.md` | Nuevas variables de entorno para catalogo de recetas |
| DDD matrix | `documentation/ai_implementation/ddd-roadmap-coverage-matrix.md` | Estado de cobertura de `shopping.list.generate` |
| Roadmap | `documentation/bot-bakery.roadmap.md` | Estado funcional fase 3 |

## Contexto
`shopping.list.generate` funcionaba con recetas embebidas (`inline`) adecuadas para smoke/mock, pero en operación live se requería que la lógica de insumos fuera configurable desde Google Sheets. Se implementó soporte para leer recetas desde una nueva hoja `CatalogoRecetas`.

## Alcance
### In Scope
- Extender `shopping-list-generate` para soportar `recipeSource=inline|gws`.
- Leer recetas live desde `CatalogoRecetas` (`gws`) con retries controlados.
- Extender configuración (`appConfig` + `.env.example` + matriz de configuración).
- Agregar/actualizar tests unitarios del tool y de config.
- Actualizar documentación técnica y de colaboración.

### Out of Scope
- Mutaciones de inventario (`inventory.consume`).
- Nuevos intents de scheduling/reminders.
- Cambios en confirm flow (sigue read-only).

## Approach
| # | Paso | Estado | Notas |
|---|---|---|---|
| 1 | Actualizar contrato spec-first de recetas live | Completed | Tool spec + docs de sistema/matriz actualizados |
| 2 | Extender config y wiring en runtime bootstrap | Completed | `appConfig` + `index.ts` con bloque `orderTool.recipes` |
| 3 | Implementar carga de recetas desde `CatalogoRecetas` via `gws` | Completed | Parser de catálogo + validaciones deterministas |
| 4 | Validar con tests focalizados y suite global | Completed | Unit focalizados + smoke summary + security + full suite |
| 5 | Cerrar plan/index/handoff | Completed | Artefactos actualizados en esta sesión |

## Decisions & Trade-offs
| Decision | Rationale | Date |
|---|---|---|
| Mantener `inline` como default | Preserva seguridad en smoke/mock y evita dependencia externa en pruebas | 2026-03-13 |
| Modo `gws` estricto falla si catálogo válido está vacío | Evita usar recetas erróneas/silenciosas en operación live | 2026-03-13 |
| Reusar fallback de configuración de `ORDER_SHEETS_*` para recetas | Reduce fricción operativa y duplicación de configuración | 2026-03-13 |

## Validation
- `npm test -- src/config/appConfig.test.ts src/tools/order/shoppingListGenerate.test.ts --run`
- `npm run test:smoke-integration:summary`
- `npm run security:scan`
- `npm test -- --run`

## Outcome
`shopping.list.generate` ahora soporta recetas en Google Sheets para live:
- Nuevo bloque de config `orderTool.recipes` (`source`, command/range/timeouts/retries).
- Tool con parser de `CatalogoRecetas` (`recipe_id, aliases_csv, insumo, unidad, cantidad_por_unidad, activo`).
- Modo `inline` conservado para smoke/mock.
- Documentación y cobertura de tests actualizadas.

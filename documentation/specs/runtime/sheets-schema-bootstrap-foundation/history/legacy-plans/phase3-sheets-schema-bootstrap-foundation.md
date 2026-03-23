# Phase 3 - sheets schema bootstrap foundation

> **Type:** `Refactoring`
> **Status:** `Complete`
> **Created:** `2026-03-13`
> **Last Updated:** `2026-03-13`

## Cross-References
| Documento | Ruta | Uso |
|---|---|---|
| Generic runner | `scripts/sheets/init-sheet-tabs-from-schema.ts` | Entry point for manifest-driven bootstrap |
| Shared engine | `scripts/sheets/_shared/bootstrap-tabs-from-schema.ts` | Core logic used by bootstrap wrappers |
| Schemas | `scripts/sheets/schemas/*.tabs.json` | Declarative tab definitions |
| Existing wrappers | `scripts/sheets/init-*.ts` | Backward-compatible commands now delegating to schema engine |

## Contexto
Con tres bootstraps (`pricing`, `recipes`, `inventory`) ya activos, la estructura repetia definiciones de headers/rows y flujo de escritura. Se implemento una base schema-driven para reducir duplicacion y acelerar futuros tab bootstraps.

## Alcance
### In Scope
- Crear engine reusable de bootstrap por schema JSON.
- Agregar schemas para pricing, recipes e inventory.
- Migrar wrappers actuales a engine compartido.
- Exponer comando generico `sheets:tabs:init:schema`.
- Actualizar env/docs para modo schema-driven.

### Out of Scope
- Cambios de negocio en tools runtime (`shopping.list.generate`, `inventory.consume`).
- Aplicar cambios live por default.
- Validacion de contenido de catalogos (solo bootstrap estructural).

## Approach
| # | Paso | Estado | Notas |
|---|---|---|---|
| 1 | Crear engine `bootstrap-tabs-from-schema` | Completed | Maneja preview/apply/overwrite + create tabs + write rows |
| 2 | Definir schemas JSON por dominio | Completed | `pricing`, `recipes`, `inventory` |
| 3 | Migrar wrappers existentes | Completed | Scripts actuales conservan comandos pero delegan al engine |
| 4 | Agregar comando generico | Completed | `sheets:tabs:init:schema` |
| 5 | Actualizar docs/env y validar previews | Completed | README + config matrix + `.env.example` + previews |

## Decisions & Trade-offs
| Decision | Rationale | Date |
|---|---|---|
| Mantener wrappers legacy (`sheets:pricing:init`, etc.) | Preserva compatibilidad operativa mientras se adopta modo schema | 2026-03-13 |
| Separar schema y engine | Facilita agregar nuevas tabs sin copiar scripts completos | 2026-03-13 |
| Usar placeholder `{{NOW_ISO}}` en schema de pricing | Conserva valor dinámico sin hardcodear timestamp fijo | 2026-03-13 |

## Validation
- `npm run sheets:pricing:preview`
- `npm run sheets:recipes:preview`
- `npm run sheets:inventory:preview`
- `SHEETS_SCHEMA_PATH=scripts/sheets/schemas/inventory-tabs.tabs.json npm run sheets:tabs:init:schema`

## Outcome
Se consolidó una base declarativa para bootstrap de tabs Sheets:
- engine compartido (`_shared/bootstrap-tabs-from-schema.ts`)
- schemas versionables (`scripts/sheets/schemas/*.tabs.json`)
- wrappers existentes migrados y comando generico habilitado.

# Phase 2 - Expense Smoke Validation

> **Type:** `Implementation`
> **Status:** `Complete`
> **Created:** `2026-03-03`
> **Last Updated:** `2026-03-03`

## Cross-References
| Documento | Ruta | Uso |
|---|---|---|
| Phase 2 implementation | `documentation/ai_collaboration/plans/platform/implementation/phase2-expense-e2e-implementation.md` | Base tecnica ya implementada |
| DDD matrix | `documentation/ai_implementation/ddd-roadmap-coverage-matrix.md` | Estado de cierre operativo |
| Config matrix | `documentation/operations/config-matrix.md` | Variables para smoke real |

## Contexto
La Fase 2 ya tiene implementacion interna, pero faltaba validacion operativa reproducible contra endpoint real (Apps Script). Se necesitaba un comando smoke estándar para correr dry-run y live sin trabajo manual ad hoc.

## Alcance
### In Scope
- Crear script reusable para smoke de `expense.add`.
- Integrar script en `package.json`.
- Ejecutar smoke dry-run local.
- Ejecutar intento live (y reportar bloqueo si falta URL real).
- Actualizar docs de operacion.

### Out of Scope
- Provisionar endpoint Apps Script.
- Implementar Fase 3.

## Approach
| # | Paso | Estado | Notas |
|---|---|---|---|
| 1 | Crear script smoke para expense connector | Completed | `scripts/smoke/expense-smoke.ts` |
| 2 | Exponer comandos npm para smoke | Completed | `smoke:expense` en `package.json` |
| 3 | Ejecutar dry-run y live attempt | Completed | dry-run OK; live bloqueado por URL faltante |
| 4 | Actualizar docs y cerrar plan/handoff | Completed | matriz DDD + config matrix |

## Validation
- `npm run smoke:expense` -> PASS (`dryRun=true`, resultado OK)
- `EXPENSE_TOOL_DRY_RUN=0 npm run smoke:expense` -> FAIL esperado (`expense_connector_url_missing`)
- `npm test` -> PASS (`20` files, `76` tests)

## Outcome
- Smoke command operativo agregado para Fase 2.
- Validación dry-run confirmada.
- Validación live preparada y bloqueada solo por configuración faltante (`EXPENSE_SHEETS_WEBHOOK_URL`).
- Queda listo ejecutar smoke real en cuanto se configure endpoint.

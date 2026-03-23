# Phase 2 - Expense E2E Implementation

> **Type:** `Implementation`
> **Status:** `Complete`
> **Created:** `2026-03-03`
> **Last Updated:** `2026-03-03`

## Cross-References
| Documento | Ruta | Uso |
|---|---|---|
| Roadmap | `documentation/bot-bakery.roadmap.md` | Alcance de Fase 2 |
| DDD coverage matrix | `documentation/ai_implementation/ddd-roadmap-coverage-matrix.md` | Seguimiento de avance |
| Expense tool spec | `documentation/specs/contracts/components/append-expense.spec.md` | Contrato del adapter |
| Implementation instructions | `documentation/ai_implementation/implementation-instructions.md` | Flujo spec-first |

## Contexto
La Fase 2 pide `expense.add` end-to-end con conector real a Sheets (Apps Script), timeout/retry/idempotencia y pruebas. El adapter estaba en stub y el runtime confirmaba con ejecucion simulada.

## Alcance
### In Scope
- Implementar adapter real `append-expense` via HTTP (configurable, dry-run por defecto).
- Integrar ejecucion real de `gasto` en `conversationProcessor` al confirmar.
- Agregar configuracion/env de connector y chequeo de readiness.
- Agregar tests unitarios del adapter y tests de runtime para exito/falla.
- Actualizar docs de spec/config/roadmap/matriz DDD.

### Out of Scope
- Implementar Fase 3 (`pedido` E2E real).
- Integraciones reales de `create-card`, `append-order`, `publish-site`.

## Approach
| # | Paso | Estado | Notas |
|---|---|---|---|
| 1 | Actualizar contratos/specs y config para connector de gasto | Completed | app-config, healthcheck, specs C4 |
| 2 | Implementar adapter HTTP real con retry/timeout + dry-run | Completed | `src/tools/expense/appendExpense.ts` |
| 3 | Integrar ejecucion en confirm flow + manejo de falla controlado | Completed | `conversationProcessor` con status `failed` |
| 4 | Agregar/actualizar pruebas | Completed | adapter/runtime/config/health |
| 5 | Actualizar docs de avance (roadmap + matriz DDD) | Completed | estado real de Fase 2 |
| 6 | Validar tests y cerrar plan + handoff | Completed | `npm test` y `npm run verify:security` en verde |

## Decisions & Trade-offs
| Decision | Rationale | Date |
|---|---|---|
| Mantener `dry-run` como default | Seguridad primero; evita side effects no deseados en dev | 2026-03-03 |
| Integrar solo `gasto` real en esta fase | Mantiene alcance acotado al roadmap Phase 2 | 2026-03-03 |
| Persistir `failed` y mantener pending en fallo de ejecucion | Permite reintento controlado (`confirmar`) sin perder trazabilidad | 2026-03-03 |

## Validation
- `npm test` -> PASS (`20` files, `76` tests)
- `npm run verify:security` -> PASS (scan + tests)
- Se verifico coherencia de roadmap, matriz DDD y specs C4 con estado real.

## Outcome
Fase 2 queda implementada a nivel codigo/specs internos:
- Conector `expense.add` con ruta HTTP real, timeout/retry bounded y dry-run default.
- Runtime ejecuta `gasto` en confirmacion y maneja fallos con `status=failed` + mensaje controlado.
- Config y healthcheck cubren readiness del conector.
- Matriz DDD/roadmap actualizados para reflejar avance y siguiente paso: smoke test con endpoint real.

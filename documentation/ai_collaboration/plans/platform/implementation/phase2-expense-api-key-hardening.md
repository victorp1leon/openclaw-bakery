# Phase 2 - Expense API Key Hardening

> **Type:** `Implementation`
> **Status:** `Complete`
> **Created:** `2026-03-04`
> **Last Updated:** `2026-03-04`

## Cross-References
| Documento | Ruta | Uso |
|---|---|---|
| Phase 2 E2E | `documentation/ai_collaboration/plans/platform/implementation/phase2-expense-e2e-implementation.md` | Base implementada |
| Smoke validation | `documentation/ai_collaboration/plans/platform/implementation/phase2-expense-smoke-validation.md` | Estado operativo actual |
| Expense tool spec | `documentation/c4/ComponentSpecs/Tools/Specs/append-expense.spec.md` | Contrato del conector |

## Contexto
El endpoint Apps Script no debe quedar expuesto sin control de autenticacion. Se endurecio el conector `expense.add` para requerir/enviar API key en modo live y se actualizaron readiness checks, tests y documentacion.

## Alcance
### In Scope
- Agregar variables de API key/header para `expense.add` en config.
- Exigir API key en modo live y enviarla como header en adapter.
- Agregar validaciones en healthcheck para configuracion insegura.
- Actualizar smoke script para contemplar configuracion de API key.
- Actualizar tests y docs (specs + config matrix + trace catalog).

### Out of Scope
- Rotacion automatica de keys.
- Hardening de Fase 3 (`order`) en esta iteracion.

## Approach
| # | Paso | Estado | Notas |
|---|---|---|---|
| 1 | Actualizar config/env + health readiness | Completed | API key + header name en config y healthcheck |
| 2 | Endurecer adapter `append-expense` | Completed | API key obligatoria en live + header configurable |
| 3 | Actualizar tests de config/health/adapter/smoke | Completed | Cobertura de reglas de seguridad |
| 4 | Actualizar docs y cerrar plan | Completed | C4 + operations + handoff |

## Decisions & Trade-offs
| Decision | Rationale | Date |
|---|---|---|
| En live exigir API key ademas de URL | Reduce exposicion del endpoint Apps Script | 2026-03-04 |
| Header de API key configurable (`x-api-key` default) | Flexibilidad para endpoint sin romper estandar | 2026-03-04 |
| Mantener dry-run como default | Seguridad primero en entornos locales | 2026-03-04 |

## Validation
- `npm test` -> PASS (`20` files, `78` tests)
- `npm run verify:security` -> PASS
- `EXPENSE_TOOL_DRY_RUN=1 npm run smoke:expense` -> PASS (dry-run)
- `EXPENSE_TOOL_DRY_RUN=0 npm run smoke:expense` -> FAIL esperado sin key (`expense_connector_api_key_missing`)
- `npm run healthcheck` -> FAIL esperado con `.env` actual por `apiKeyConfigured=0` en live

## Outcome
Hardening aplicado:
- Conector live de gasto ahora exige API key y la envia en header configurable.
- Healthcheck bloquea configuraciones live inseguras (sin key).
- Smoke y documentación operativa actualizados para flujo seguro.

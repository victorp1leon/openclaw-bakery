# Admin Logs - Implementation Plan

> **Domain:** `runtime`
> **Feature Slug:** `admin-logs`
> **Status:** `Complete`
> **Created:** `2026-03-25`
> **Last Updated:** `2026-03-25`
> **Legacy Sources:** `N/A`

## Scope
### In Scope
- Tool read-only `admin.logs` sobre SQLite `operations`.
- Routing read-only (`OpenClaw`) + fallback deterministico.
- Respuesta runtime con `trace_ref` en exito/no-match/fallo controlado.
- Cobertura de pruebas unit/router/runtime y smoke dedicado.
- Registro en summary runner de smoke/integration.

### Out of Scope
- Mutaciones admin (`admin.allowlist`).
- Retencion/higiene automatica de tabla `operations`.
- Filtros avanzados (status/intent/rango temporal) fuera de `chat_id|operation_id|limit`.

## Approach
| # | Step | Status | Notes |
|---|---|---|---|
| 1 | Definir contrato de salida y redaccion | Complete | `payload_preview` sanitizado + `trace_ref` |
| 2 | Implementar tool `admin.logs` | Complete | `src/tools/admin/adminLogs.ts` |
| 3 | Integrar routing + fallback runtime | Complete | `readOnlyIntentRouter` + `conversationProcessor` |
| 4 | Agregar pruebas unit/router/runtime | Complete | Cobertura de filtros, fallback y fallo controlado |
| 5 | Agregar smoke y registro en summary runner | Complete | `smoke:admin-logs` registrado |
| 6 | Ejecutar validacion final | Complete | Unit focal, smoke dedicado, smoke summary, intent-skill gate y security scan |

## Validation
- Commands executed:
  - `CI=1 npm test -- --run src/tools/admin/adminLogs.test.ts src/tools/admin/adminHealth.test.ts src/tools/admin/adminConfigView.test.ts src/skills/readOnlyIntentRouter.test.ts src/runtime/conversationProcessor.test.ts`
  - `SMOKE_CHAT_ID=smoke-admin-logs-20260325 npm run smoke:admin-logs`
  - `npm run test:smoke-integration:summary`
  - `npm run check:intent-skills`
  - `npm run security:scan`
- Results:
  - `120/120` tests passed en suite focal (`tool + router + runtime`).
  - Smoke `admin-logs` en verde (exito + fallo controlado con `Ref`).
  - `reports/smoke-integration/latest-summary.json` actualizado con escenarios `smoke:admin-logs` en `PASS`.
  - `check:intent-skills` en verde tras agregar `skills/admin.logs/SKILL.md`.
  - `security:scan` sin hallazgos de alta confianza.
- Acceptance criteria:
  - `admin.logs` disponible por OpenClaw y fallback deterministico.
  - Filtros por `chat_id|operation_id` y limit acotado en runtime.
  - Sin fuga de secretos en preview/errores y con `trace_ref` trazable.

# Admin Config View - Implementation Plan

> **Domain:** `runtime`
> **Feature Slug:** `admin-config-view`
> **Status:** `Complete`
> **Created:** `2026-03-24`
> **Last Updated:** `2026-03-24`
> **Legacy Sources:** `N/A`

## Scope
### In Scope
- Tool read-only sanitizado para snapshot de configuracion.
- Routing read-only (`OpenClaw`) + fallback deterministico.
- Respuesta runtime con `trace_ref` en exito/fallo.
- Cobertura de tests y smoke dedicado.

### Out of Scope
- Mutaciones de configuracion (`admin.allowlist`, `admin.logs`).
- Auto-remediacion de configuraciones inseguras.
- Integraciones externas adicionales.

## Approach
| # | Step | Status | Notes |
|---|---|---|---|
| 1 | Definir contrato de salida sanitizada | Complete | Snapshot solo con flags/counts/limites |
| 2 | Implementar tool `admin.config.view` | Complete | `src/tools/admin/adminConfigView.ts` |
| 3 | Integrar routing + fallback runtime | Complete | `readOnlyIntentRouter` + `conversationProcessor` |
| 4 | Agregar pruebas unit/router/runtime | Complete | Cobertura funcional + no-fuga |
| 5 | Agregar smoke y summary runner | Complete | `smoke:admin-config-view` registrado |
| 6 | Ejecutar validacion final | Complete | Unit focal, smoke dedicado, smoke/integration summary y security scan en verde |

## Validation
- Commands executed:
  - `CI=1 npm test -- --run src/tools/admin/adminConfigView.test.ts src/skills/readOnlyIntentRouter.test.ts src/runtime/conversationProcessor.test.ts`
  - `SMOKE_CHAT_ID=smoke-admin-config-view-20260324 npm run smoke:admin-config-view`
  - `npm run test:smoke-integration:summary`
  - `npm run security:scan`
- Results:
  - `99/99` tests passed en suite focal (`tool + router + runtime`).
  - Smoke `admin-config-view` en verde (casos exito + fallo controlado con `Ref`).
  - Smoke/integration summary actualizado con `82/82 PASS`.
  - Security scan sin hallazgos de secretos de alta confianza.
- Acceptance criteria:
  - Respuesta `admin.config.view` disponible por OpenClaw y fallback.
  - Cero secretos en salida serializada.
  - Tests y smoke relevantes en verde.

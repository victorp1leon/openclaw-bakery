# Admin Health - Implementation Plan

> **Domain:** `runtime`
> **Feature Slug:** `admin-health`
> **Status:** `Complete`
> **Created:** `2026-03-23`
> **Last Updated:** `2026-03-23`
> **Legacy Sources:** `N/A`

## Scope
### In Scope
- Routing/intencion para `admin.health`.
- Ejecucion read-only usando healthcheck existente.
- Respuesta operativa sanitizada con `trace_ref`.
- Cobertura de pruebas unitarias/runtime y smoke.

### Out of Scope
- Nuevas mutaciones admin.
- Dashboard/telemetria externa.
- Cambios de alcance para `admin.logs`, `admin.config.view`, `admin.allowlist`.

## Approach
| # | Step | Status | Notes |
|---|---|---|---|
| 1 | Definir contrato de entrada/salida de `admin.health` | Complete | Basado en paquete spec y clarifications |
| 2 | Integrar routing + parser/skill para intent admin | Complete | `readOnlyIntentRouter` soporta `admin.health` |
| 3 | Conectar intent a healthcheck read-only | Complete | Nuevo tool `src/tools/admin/adminHealth.ts` reusa `runHealthcheck` |
| 4 | Formatear respuesta segura con `trace_ref` | Complete | Reply runtime + sanitizacion de detalles sensibles |
| 5 | Agregar pruebas unitarias y runtime | Complete | Unit + runtime tests agregados y en verde |
| 6 | Ejecutar smoke/integration proporcional | Complete | Smoke dedicado + smoke/integration summary en verde |

## Validation
- Commands (planned):
  - `CI=1 npm test -- --run src/tools/admin/adminHealth.test.ts src/skills/readOnlyIntentRouter.test.ts src/runtime/conversationProcessor.test.ts`
  - `SMOKE_CHAT_ID=smoke-admin-health-20260323 npm run smoke:admin-health`
  - `npm run test:smoke-integration:summary`
  - `npm run security:scan`
- Acceptance criteria:
  - Intent `admin.health` responde estado operativo sin secretos.
  - Falla controlada incluye `Ref/trace_ref`.
  - Tests y smoke relevantes pasan.

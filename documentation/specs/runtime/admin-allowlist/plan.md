# Admin Allowlist - Implementation Plan

> **Domain:** `runtime`
> **Feature Slug:** `admin-allowlist`
> **Status:** `Complete`
> **Created:** `2026-03-25`
> **Last Updated:** `2026-03-25`
> **Legacy Sources:** `N/A`

## Scope
### In Scope
- Tool admin mutable para `view|add|remove` con guardrails.
- Integracion runtime con confirm flow para `add/remove`.
- Prompt de faltante `admin_allowlist_target_chat_id`.
- Respuesta formateada con `Ref/trace_ref` en exito/fallo.
- Tests unit/runtime y smoke dedicado.

### Out of Scope
- Persistencia de allowlist en `.env` o backend externo.
- Modelo multi-rol de administracion.
- Consola de auditoria avanzada de cambios de allowlist.

## Approach
| # | Step | Status | Notes |
|---|---|---|---|
| 1 | Definir contrato operativo y guardrails | Complete | `view|add|remove`, `self-remove` bloqueado, minimo de allowlist |
| 2 | Implementar tool `adminAllowlist` + tests | Complete | `src/tools/admin/adminAllowlist.ts` |
| 3 | Integrar runtime pending/confirm flow | Complete | `src/runtime/conversationProcessor.ts` + `src/state/stateStore.ts` |
| 4 | Agregar wiring bootstrap y persona prompt key | Complete | `src/index.ts` + `src/runtime/persona.ts` |
| 5 | Crear smoke dedicado y registrar summary | Complete | `scripts/smoke/admin-allowlist-smoke.ts` |
| 6 | Ejecutar validacion final y cerrar docs/plan | Complete | tests + smoke + intent-skill + security en verde |

## Validation
- Commands executed:
  - `npm test -- --run src/tools/admin/adminAllowlist.test.ts src/runtime/conversationProcessor.test.ts`
  - `SMOKE_CHAT_ID=smoke-admin-allowlist-20260325 npm run smoke:admin-allowlist`
  - `npm run check:intent-skills`
  - `npm run security:scan`
- Results:
  - Suite focal en verde (`adminAllowlist` + runtime).
  - Smoke dedicado en verde (view, add/remove confirmados, self-remove bloqueado, fallo controlado).
  - Gate de intent-skill coverage en verde (incluye `admin.allowlist`).
  - Security scan en verde.
- Acceptance criteria:
  - `admin.allowlist` operativo con guardrails y confirm flow.
  - Trazabilidad `Ref/trace_ref` consistente en exito/fallo controlado.

# Session Handoff: Phase 3 GWS-Only Sheets Migration - 2026-03-11

> **Plan:** `documentation/ai_collaboration/plans/runtime/implementation/phase3-order-lifecycle-skills-spec-first.md`
> **Date:** `2026-03-11`
> **Owner:** `Codex + Dev`

## What Was Done
- Se completo migracion operativa a `gws` para integraciones de Google Sheets en runtime:
  - `expense.add` (`appendExpense`) sin ruta `apps_script`.
  - `order.create` (`appendOrder`) sin ruta `apps_script`.
- Se removio wiring/config legacy de `apps_script` en runtime/config/healthcheck.
- Se eliminaron scripts legacy de Apps Script:
  - `scripts/webhook/add_expense.js`
  - `scripts/webhook/add_order.js`
  - `scripts/webhook/check-order-webhook.js`
- Se alineo documentacion operativa principal a `gws` only:
  - roadmap/overview/system-map/component docs/config docs/logging docs.

## Validation
- `npm test` -> ✅ `30 files`, `204 tests` passed.

## Current State
- Para gastos y pedidos, Google Sheets se ejecuta por `gws` unicamente.
- No hay rutas de webhook/API key de Apps Script activas en runtime.
- Smokes y healthcheck describen/validan conectores `gws`.

## Open Issues
- Documentos historicos de planes/sesiones antiguas aun mencionan Apps Script como parte del contexto de ese momento.
- Si se requiere live `expense.add`, faltan en `.env`:
  - `EXPENSE_GWS_SPREADSHEET_ID`
  - `EXPENSE_GWS_RANGE`

## Next Steps
1. Si se desea limpieza total de historial textual, hacer un pase dedicado sobre planes cerrados antiguos (sin alterar hechos historicos, solo anotando deprecacion).
2. Continuar Fase 3 con `payment.record` (pendiente en plan activo).

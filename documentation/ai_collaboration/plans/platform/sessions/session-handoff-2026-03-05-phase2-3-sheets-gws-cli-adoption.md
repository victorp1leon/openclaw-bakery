# Session Handoff: Phase 2-3 Sheets GWS CLI Adoption - 2026-03-05

> **Plan:** `documentation/ai_collaboration/plans/platform/implementation/phase2-3-sheets-gws-cli-adoption.md`
> **Date:** `2026-03-05`
> **Owner:** `Codex + Dev`

## What Was Done
- Se implemento provider toggle de Sheets para `expense.add` y `order.create`: `apps_script` (default) o `gws`.
- Se agrego runner CLI reutilizable `src/tools/googleWorkspace/runGwsCommand.ts` con timeout y captura de salida.
- Se extendieron `appendExpense` y `appendOrder` para enrutar por provider manteniendo `dry-run`, retries bounded e `operation_id`.
- Se actualizaron `appConfig`, `index` y smoke scripts para wiring completo de provider + configuracion `gws`.
- Se actualizo `healthcheck` con validacion por provider.
- Se agregaron pruebas de `gws` path en adapters y se actualizaron pruebas de config/health.
- Se actualizo documentacion C4/specs/roadmap/matriz DDD y tracking de planes.

## Current State
- Ruta actual de produccion (`apps_script`) se mantiene funcional y como default.
- Ruta `gws` ya esta implementada y activable por env para ambos flujos de Sheets.
- Tests focalizados en verde:
  - `src/tools/expense/appendExpense.test.ts`
  - `src/tools/order/appendOrder.test.ts`
  - `src/config/appConfig.test.ts`
  - `src/health/healthcheck.test.ts`

## Open Issues
- Falta smoke test live del provider `gws` contra spreadsheet real para validar auth/comando en entorno operativo.
- El host actual no tiene `gws` instalado por defecto, por lo que se requiere setup operativo previo.

## Next Steps
1. Configurar credenciales `gws` en entorno controlado y ejecutar `smoke:expense`/`smoke:order` con provider `gws`.
2. Ajustar comandos/args `gws` por entorno (si usan wrapper o `npx`) y documentar runbook final de rollout.
3. Activar `gws` en canary antes de promoverlo en entorno principal.

## Key Decisions
- Adopcion incremental: no reemplazar Apps Script de inmediato para evitar regresiones operativas.
- Mantener `apps_script` como default hasta completar smoke live de `gws`.
- Preservar contrato de tool y controles existentes (confirmacion runtime, retries bounded, `operation_id`).

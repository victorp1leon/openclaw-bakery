# Rule: GWS Only for Google Integrations

## Policy
- Toda integracion de Google Sheets para gasto/pedidos debe ejecutarse via `gws`.
- No introducir ni reactivar providers `apps_script` en runtime, config, healthcheck, o smoke scripts.

## Applies To
- `src/tools/expense/*`
- `src/tools/order/*`
- `src/config/*`
- `src/health*`
- `scripts/smoke/*`

## Verification
- Revisar config/env para providers:
  - `EXPENSE_SHEETS_PROVIDER=gws`
  - `ORDER_SHEETS_PROVIDER=gws`
- Verificar que no se agregaron rutas `apps_script`.

## Exception Handling
- Si hay bloqueo operativo en `gws`, registrar excepcion temporal en plan activo con fecha de retiro.

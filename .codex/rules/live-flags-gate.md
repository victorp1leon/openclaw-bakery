# Rule: Live Flags Gate

## Policy
- Ninguna prueba u operacion live debe correr sin flag explicito activado.
- Defaults deben permanecer en modo seguro/mock cuando aplique.

## Required Flags (Examples)
- `SMOKE_SUMMARY_LIVE=1`
- `SMOKE_LIFECYCLE_LIVE=1`
- `SMOKE_UPDATE_LIVE=1`
- `SMOKE_CANCEL_LIVE=1`
- `SMOKE_STATUS_LIVE=1`
- `SMOKE_LOOKUP_LIVE=1`

## Verification
- Antes de ejecutar live, registrar en salida:
  - modo (`mock` o `live`)
  - `dryRun` efectivo
- Si falta flag live, usar comando mock/default equivalente.

## Notes
- Evita mutaciones accidentales en Trello/Sheets durante debug local.

> Migration Trace: Canonical copy generated from `documentation/c4/ComponentSpecs/Tools/Specs/pricing-catalog-bootstrap.spec.md` on 2026-03-23 (Wave C.1).
> Legacy C4 source path is preserved as historical trace metadata; files were retired in Wave C.2.

# Spec - pricing-catalog-bootstrap (Phase 3 quote foundation)

Status: MVP
Last Updated: 2026-03-12

## Objective
Initialize a dedicated Google Sheets tab for pricing catalog data used by `quote.order` design foundation.
This script is operational bootstrap only and must keep safe defaults (`preview` unless explicitly applied).

## Inputs
- Environment configuration:
  - `PRICING_CATALOG_APPLY`
  - `PRICING_CATALOG_OVERWRITE`
  - `PRICING_CATALOG_TAB_NAME`
  - `PRICING_CATALOG_GWS_*` (with fallback to `ORDER_SHEETS_GWS_*`)
  - `PRICING_CATALOG_TIMEOUT_MS`

## Outputs
- Structured console events (`start`, `preview`, `skipped`, `done`, `failed`).
- In apply mode:
  - dedicated tab exists (default: `CatalogoPrecios`)
  - seed header + rows persisted via `gws`.

## Business Rules
- Preview mode is default (`PRICING_CATALOG_APPLY=0`) and must not mutate external state.
- Apply mode (`PRICING_CATALOG_APPLY=1`) may:
  - create tab if missing (`spreadsheets.batchUpdate addSheet`)
  - write seed table (`spreadsheets.values.update`)
- If tab already has data and overwrite is disabled, operation must skip safely.
- Overwrite requires explicit opt-in (`PRICING_CATALOG_OVERWRITE=1`).
- Use `gws` as the only Google Sheets integration path.

## Seed Table Contract
- Header columns:
  - `tipo, clave, nombre, monto_mxn, modo_calculo, aplica_a, cantidad_min, cantidad_max, horas_max_anticipacion, zona, activo, notas, actualizado_en`
- Initial rows must include baseline entries for:
  - `PRODUCTO`
  - `EXTRA`
  - `ENVIO`
  - `URGENCIA`
  - `POLITICA`

## Error Handling
- Missing spreadsheet id in apply mode -> non-retriable failure (`pricing_catalog_spreadsheet_id_missing`).
- `gws` timeout -> non-retriable failure (`pricing_catalog_gws_timeout`).
- Downstream API/auth/validation errors -> sanitized `pricing_catalog_gws_*`.

## Security Constraints
- No secret/token logging.
- Preview mode should be preferred for validation before live apply.
- Only explicit apply can mutate Sheets.

## Test Cases
- `preview_mode_outputs_plan_without_mutation`
- `apply_mode_fails_without_spreadsheet_id`
- `apply_mode_creates_tab_when_missing`
- `apply_mode_skips_when_tab_has_data_and_overwrite_off`
- `apply_mode_overwrites_when_overwrite_on`

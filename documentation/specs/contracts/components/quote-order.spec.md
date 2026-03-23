> Migration Trace: Canonical copy generated from `documentation/c4/ComponentSpecs/Tools/Specs/quote-order.spec.md` on 2026-03-23 (Wave C.1).
> Legacy C4 source path is preserved as historical trace metadata; files were retired in Wave C.2.

# Spec - quote-order (Phase 3 pricing catalog)

Status: MVP
Last Updated: 2026-03-19

## Objective
Generate a read-only order quote from Google Sheets pricing catalogs (`CatalogoPrecios`, `CatalogoOpciones`, `CatalogoReferencias`) without creating or mutating orders.

## Inputs
- `query`: free-text quote request (product, quantity, extras, shipping hints, urgency hints).
- Google Workspace CLI configuration:
  - command + optional args
  - spreadsheet id
  - read ranges for `CatalogoPrecios`, `CatalogoOpciones`, `CatalogoReferencias`
  - timeout/retries
- Optional defaults:
  - currency label (default `MXN`)
  - current time provider (`now`) for deterministic tests

## Outputs
- Structured quote result:
  - `product` (matched base product)
  - `quantity`
  - `lines[]` (`base|option|extra|shipping|urgency`)
  - `subtotal`
  - `total`
  - optional `suggestedDeposit`
  - optional `quoteValidityHours`
  - optional `optionSuggestions` (listas por categoria para flujo guiado: pan/relleno/betun/topping)
  - optional `referenceContext` (informational only, no arithmetic impact)
  - `assumptions[]`
- Deterministic errors (`quote_order_*`) on config/provider/matching failures.

## Rules
- Source of truth is Google Sheets catalogs (read-only).
- Query via `gws` using `sheets spreadsheets values get`.
- `CatalogoPrecios` provides base products + policy rows + shipping + urgency + fallback extras.
- `CatalogoOpciones` provides optional add-ons/extras.
- `CatalogoReferencias` is informational only (never added to final total).
- Matching must be accent-insensitive and case-insensitive.
- Base product is mandatory; if none matches, return `quote_order_product_not_found`.
- Quantity defaults to `1` when not explicit.
- Shipping cost is included only when query indicates home delivery.
- Home delivery requires an explicit/recognized shipping zone; otherwise return `quote_order_shipping_zone_missing` (or `quote_order_shipping_zone_ambiguous`).
- Urgency surcharge is applied when query contains urgency/lead-time hints and matching policy rows exist.
- Options/extras are auto-applied only with high-confidence fuzzy score.
- When options/extras are partially matched (gray zone), return `quote_order_modifier_ambiguous` to force runtime clarification.
- Policy rows may define:
  - suggested deposit (`anticipo`)
  - quote validity hours (`vigencia`)
- Never expose secrets/tokens in user-facing errors.

## Error Handling Classification
- Retriable:
  - `gws` timeout
  - transient network failures
  - rate limit / `5xx` style failures surfaced by CLI payload
- Non-retriable:
  - missing spreadsheet id
  - malformed non-JSON CLI payload
  - command unavailable (`ENOENT`)
  - empty pricing catalog
  - product not found in catalog
  - shipping zone missing/ambiguous for home delivery
  - ambiguous modifier matching requiring user clarification

## Security Constraints
- No write operations against Sheets in this tool.
- No logging of credentials or full command env.
- Error tokens must be sanitized before surfacing upstream.

## Test Cases
- `fails_when_spreadsheet_id_missing`
- `calculates_quote_from_base_options_extras_shipping_urgency`
- `fails_when_no_product_can_be_matched`
- `fails_when_home_delivery_zone_missing`
- `fails_when_modifier_matching_is_ambiguous`

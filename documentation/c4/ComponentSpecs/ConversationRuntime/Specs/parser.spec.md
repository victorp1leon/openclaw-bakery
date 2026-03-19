# Spec - parser (expense/order)

Status: MVP
Last Updated: 2026-03-19

## Objective
Convert free-form text into JSON drafts for `expense` and `order` using OpenClaw + local heuristics.
It must extract/normalize draft payloads and must not authorize or execute external actions.

## Inputs
- free-form user text
- OpenClaw JSON/text response payloads (plain or markdown-fenced)
- local heuristic extractors/normalizers

## Outputs
- draft payload for target intent (`expense`/`order`)
- parse metadata/source (`openclaw`, fallback, hybrid) when available

## Rules
- Accept plain JSON payloads or JSON inside markdown code blocks from OpenClaw.
- If OpenClaw returns a partial draft, fill missing fields with local heuristics without overwriting valid extracted fields.
- Sanitize optional fields that are hallucinated or not evidenced by the input text.
- Normalize currency (`pesos` -> `MXN`, `dolares` -> `USD`) when reasonable.
- Keep compatibility with Zod draft schemas (optional fields allowed).
- For order drafts, allow natural delivery expressions (`hoy`, `mañana`, `pasado mañana`, `viernes`) as draft input, but final canonicalization to `YYYY-MM-DDTHH:mm:ss` (`America/Mexico_City`) is enforced by runtime/tool validation before confirmation/execution.

## Error Handling Classification
- Retriable: transient upstream runtime failures when OpenClaw path is used.
- Non-retriable: irrecoverably invalid/unextractable payload after extraction/fallback attempts.

## Security Constraints
- Never pass through untrusted fields without schema/guard validation.
- Parser output is advisory and must be validated before confirmation/execution.

## Idempotency / Dedupe
- Not handled in parser; delegated to runtime/state layers after validation.

## Test Cases
- `fills_missing_expense_fields_from_heuristics`
- `parses_amount_from_por_190_pesos_even_with_1kilo_token`
- `sanitizes_hallucinated_expense_optionals`
- `fills_missing_order_fields_from_partial_openclaw_payload`
- `sanitizes_hallucinated_order_optionals`

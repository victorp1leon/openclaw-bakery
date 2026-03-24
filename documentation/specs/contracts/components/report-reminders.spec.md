# Spec - report-reminders (Phase 3 reporting)

Status: MVP
Last Updated: 2026-03-24

## Objective
Build a read-only reminders report for upcoming deliveries with urgency prioritization.
The result must summarize actionable reminders for a selected period without mutating external systems.

## Inputs
- `period`:
  - `today|tomorrow|week` aliases
  - or explicit `day|week|month|year` filter
- `timezone`: default `America/Mexico_City`
- report dependency:
  - `report-orders` executor for period-filtered order reads

## Outputs
- Structured reminders response:
  - `period`
  - `timezone`
  - `generated_at`
  - `total`
  - `reminders[]` (sorted by urgency + delivery proximity)
  - `inconsistencies[]`
  - `trace_ref`
  - `detail`
- Reminder item fields include:
  - order reference fields (`folio|operation_id`, customer/product, delivery datetime)
  - `reminder_status` (`overdue|due_soon|upcoming`)
  - `minutes_to_delivery`
- Deterministic errors (`report_reminders_*`) for upstream/provider failures.

## Rules
- Tool is strictly read-only.
- Period normalization and date filtering must remain deterministic.
- Urgency classification:
  - `overdue`: delivery time < now
  - `due_soon`: delivery within configured threshold (default 120 minutes)
  - `upcoming`: delivery after threshold
- Rows with invalid delivery datetime must not crash the report:
  - exclude from reminder ranking,
  - expose as `inconsistencies[]`.
- Reply traceability must use `report-reminders:<period-token>:a<attempt>`.

## Error Handling Classification
- Retriable:
  - transient upstream read failures (`report-orders` provider/transient errors)
- Non-retriable:
  - invalid period payload
  - deterministic parse/config errors from upstream read stack

## Security Constraints
- No write operations against Sheets or external systems.
- Never expose credentials/tokens/raw stderr in user-facing output.
- Keep detail fields sanitized and operational.

## Test Cases
- `builds_reminders_sorted_by_urgency_and_proximity`
- `keeps_and_extends_inconsistencies_for_invalid_delivery_datetime`
- `applies_output_limit_while_preserving_total`

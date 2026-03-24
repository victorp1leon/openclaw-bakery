# Spec - schedule-week-view (Phase 3 scheduling)

Status: MVP
Last Updated: 2026-03-24

## Objective
Build a read-only week schedule for bakery operations by aggregating 7 day schedules (Monday-Sunday).
The result must summarize weekly load, preparation focus, and suggested purchases without mutating external systems.

## Inputs
- `week`:
  - `anchorDateKey` (`YYYY-MM-DD`)
  - user-facing label
- `timezone`: default `America/Mexico_City`
- day schedule dependency:
  - `schedule-day-view` executor (real tool or injected dependency)

## Outputs
- Structured weekly response:
  - `week`
  - `timezone`
  - `trace_ref`
  - `totalOrders`
  - `days[]` (ordered Monday-Sunday)
  - `reminders[]` (per-day load window)
  - `preparation[]` (weekly aggregation by product)
  - `suggestedPurchases[]` (weekly aggregation by item/unit/source)
  - `inconsistencies[]` (day inconsistency + `dateKey`)
  - `assumptions[]`
  - `detail`
- Deterministic errors (`schedule_week_view_*`) for invalid payload or per-day failures.

## Rules
- Week resolution must start on Monday and end on Sunday in configured timezone.
- The tool must execute day schedule for each week date and preserve deterministic ordering.
- Day-level inconsistencies must be propagated with explicit `dateKey`.
- Weekly `preparation` and `suggestedPurchases` must aggregate totals across all week days.
- If one day execution fails, tool returns controlled failure token including failed `dateKey`.
- Never expose credentials/tokens in user-facing messages.

## Error Handling Classification
- Retriable:
  - transient dependency failures from `schedule-day-view` (timeouts/network/rate-limit)
- Non-retriable:
  - invalid week payload (`anchorDateKey`)
  - malformed dependency response

## Security Constraints
- No write operations against external systems in this tool.
- Keep weekly response read-only and sanitized.
- Error tokens must be safe for upstream controlled messaging.

## Test Cases
- `fails_when_anchor_week_date_is_invalid`
- `aggregates_week_with_monday_sunday_order`
- `propagates_day_inconsistencies_with_date_key`
- `fails_when_one_day_resolution_fails`

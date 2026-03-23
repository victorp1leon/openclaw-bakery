> Migration Trace: Canonical copy generated from `documentation/c4/ComponentSpecs/ConfigAndHealthcheck/Specs/healthcheck.spec.md` on 2026-03-23 (Wave C.1).
> Legacy C4 source path is preserved as historical trace metadata; files were retired in Wave C.2.

# Spec - healthcheck

Status: MVP
Last Updated: 2026-03-04

## Objective
Generate a summarized `HealthReport` for startup/runtime readiness using config + local runtime signals.
It must report readiness state and must not mutate runtime/business state.

## Inputs
- `config: AppConfig`
- `dbOpen: boolean`
- `dbPath: string`
- `allowlistSize: number`

## Outputs
- `HealthReport`
  - `status: ok | warn | fail`
  - `checks: HealthCheckItem[]` (`name`, `status`, `detail`)

## Rules
- Include checks for at least: `env`, `allowlist`, `sqlite`, `openclaw_runtime`, `rate_limit`, `expense_connector`, `order_trello_connector`, `order_sheets_connector`, `channel`, `skills`, `tools_skeleton`.
- Aggregate status with precedence: any `fail` => `fail`; else any `warn` => `warn`; else `ok`.
- `allowlist` should warn (not fail) when empty in deny-by-default mode.
- `channel` should fail when `CHANNEL_MODE=telegram` and token is missing.
- `rate_limit` should be `warn` when disabled and `ok` when enabled.
- `expense_connector` should:
  - `warn` when dry-run is enabled,
  - `fail` when dry-run is disabled and webhook URL is missing,
  - `fail` when dry-run is disabled and API key is missing,
  - `ok` when dry-run is disabled and connector URL/API key are configured.
- `order_trello_connector` should:
  - `warn` when dry-run is enabled,
  - `fail` when dry-run is disabled and `apiKey`/`token`/`listId` are missing,
  - `ok` when dry-run is disabled and required Trello credentials are configured.
- `order_sheets_connector` should:
  - `warn` when dry-run is enabled,
  - `fail` when dry-run is disabled and webhook URL is missing,
  - `fail` when dry-run is disabled and API key is missing,
  - `ok` when dry-run is disabled and connector URL/API key are configured.
- Check details must be useful for operators and must not include secrets.

## Error Handling Classification
- Retriable: temporary runtime readiness failures (e.g., transient DB open failure) should be represented as health status.
- Non-retriable: structural configuration issues should be reflected as deterministic `fail`/`warn` checks.

## Security Constraints
- Health report details must be sanitized and never leak tokens or credentials.
- Healthcheck should expose only operationally necessary metadata.

## Idempotency / Dedupe
- Not applicable in this component (read-only status aggregation).

## Test Cases
- `returns_fail_when_sqlite_closed`
- `returns_warn_when_allowlist_empty`
- `returns_fail_for_telegram_without_token`
- `returns_warn_when_rate_limit_disabled`
- `returns_fail_when_expense_connector_not_configured_and_dry_run_off`
- `returns_fail_when_expense_connector_api_key_missing_and_dry_run_off`
- `returns_fail_when_order_trello_connector_not_configured_and_dry_run_off`
- `returns_fail_when_order_sheets_connector_api_key_missing_and_dry_run_off`
- `aggregates_status_precedence_fail_over_warn_over_ok`

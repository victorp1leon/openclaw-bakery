# Spec - appConfig

Status: MVP
Last Updated: 2026-03-05

## Objective
Parse environment variables into a typed `AppConfig` object with stable defaults and safe normalization.
It must provide deterministic parsing only and must not perform runtime connectivity checks.

## Inputs
- `env: NodeJS.ProcessEnv` (optional, defaults to `process.env`)

## Outputs
- `AppConfig`
  - runtime defaults (`nodeEnv`, `timezone`, `defaultCurrency`)
  - channel config (`channelMode`, telegram settings)
  - OpenClaw config (`enabled`, `agentId`, `profile`, timeouts, strict flags)
  - rate limit config (`enabled`, `windowMs`, `maxMessagesPerWindow`, `blockDurationMs`)
  - expense tool config (`dryRun`, `sheetsProvider`, `timeoutMs`, `maxRetries`, `gws`)
  - order tool config:
    - Trello (`dryRun`, `apiKey`, `token`, `listId`, `apiBaseUrl`, `timeoutMs`, `maxRetries`)
    - Sheets (`dryRun`, `provider`, `timeoutMs`, `maxRetries`, `gws`)
  - allowlist/raw local dev identifiers

## Rules
- Parse numeric config with positive-integer fallback behavior.
- Parse retry counters with non-negative integer fallback behavior.
- Normalize/trim optional string values.
- `CHANNEL_MODE` supports `console` and `telegram`; unknown values fall back to `console` in MVP.
- Boolean feature flags are derived from explicit `"1"` values.
- Rate limit numeric thresholds must remain positive integers via fallback normalization.
- Expense connector should default to safe mode (`EXPENSE_TOOL_DRY_RUN=1`) unless explicitly disabled.
- Expense Sheets provider should default to `gws`.
- Expense `gws` command should default to `gws` and value input option to `USER_ENTERED`.
- Order Trello connector should default to safe mode (`ORDER_TRELLO_DRY_RUN=1`) unless explicitly disabled.
- Order Sheets connector should default to safe mode (`ORDER_SHEETS_DRY_RUN=1`) unless explicitly disabled.
- Order Sheets provider should default to `gws`.
- Order Sheets `gws` command should default to `gws` and value input option to `USER_ENTERED`.
- Do not validate external connectivity here (healthcheck is responsible for runtime checks).

## Error Handling Classification
- Retriable: not applicable (pure parsing behavior).
- Non-retriable: not applicable in MVP (invalid values fall back to deterministic defaults).

## Security Constraints
- Config parsing must not print or expose raw secret values.
- Secret-bearing values should remain opaque to logs unless explicitly redacted.
- API keys/tokens must be treated as secret-bearing values.

## Idempotency / Dedupe
- Not applicable in this component (no action execution).

## Test Cases
- `loads_defaults_when_env_missing`
- `parses_openclaw_flags_and_timeouts`
- `parses_rate_limit_flags_and_thresholds`
- `falls_back_to_console_on_unknown_channel_mode`
- `parses_expense_tool_connector_settings`
- `parses_order_tool_connector_settings`
- `loads_default_sheets_provider_and_gws_defaults`

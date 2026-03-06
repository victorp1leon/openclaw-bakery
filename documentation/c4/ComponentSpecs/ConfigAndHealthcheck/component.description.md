# Component Description - Config & Healthcheck

Status: MVP
Last Updated: 2026-02-26

## Responsibility
Load runtime configuration from environment variables, normalize defaults, and produce a startup health report with actionable checks.

## Components
- `appConfig.ts`: parses env vars into typed `AppConfig`
- `healthcheck.ts`: evaluates config/runtime prerequisites and emits a summarized health report

## Design Rules
- Config parsing should be deterministic and safe (fallback defaults for non-critical values).
- Healthcheck must not expose secrets (tokens/credentials) in `detail`.
- Healthcheck status aggregation must be predictable (`fail` > `warn` > `ok`).


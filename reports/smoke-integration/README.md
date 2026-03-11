# Smoke + Integration Reports

This folder stores generated summaries for smoke and integration tests.

## Generate summary (recommended default)

```bash
npm run test:smoke-integration:summary
```

This runs:
- smoke scripts (mock/dry-run safe mode by default)
- integration tests (`src/**/*.integration.test.ts`)

## Live smoke mode (optional)

```bash
SMOKE_SUMMARY_LIVE=1 npm run test:smoke-integration:summary
```

In live mode, smoke commands run with your current environment and credentials.

## Outputs

- `latest-summary.md`: human-readable table (scenario/case/test + PASS/FAILED)
- `latest-summary.json`: machine-readable summary
- `history/<timestamp>-summary.md`: historical markdown snapshots
- `history/<timestamp>-summary.json`: historical JSON snapshots
- `history/<timestamp>-*.log`: raw command logs per smoke/integration run

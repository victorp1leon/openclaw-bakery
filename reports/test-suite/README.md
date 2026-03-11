# Test Suite Reports

This folder stores generated test summaries.

## Generate a summary

```bash
npm run test:summary
```

## Outputs

- `latest-summary.md`: Markdown table with scenario/case/test and PASS/FAILED.
- `latest-vitest.json`: raw Vitest JSON output for machine parsing.
- `history/<timestamp>-summary.md`: timestamped Markdown history.
- `history/<timestamp>-vitest.json`: timestamped raw JSON history.

## Notes

- Generated artifacts are ignored by git in this folder (except this `README.md` and `.gitignore`).
- You can pass Vitest filters through npm:

```bash
npm run test:summary -- src/tools/order/orderCardSync.test.ts
```

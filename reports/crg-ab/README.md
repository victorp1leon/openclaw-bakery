# CRG A/B Reports

Generated artifacts for comparing:
- heuristic review signals (without CRG)
- graph-based impact signals (with CRG)

Canonical latest files:
- `latest-summary.md`
- `latest-summary.json`

Historical runs:
- `history/<timestamp>-summary.md`
- `history/<timestamp>-summary.json`

Run command:
- `npm run test:crg-ab:summary`

Optional args:
- `npm run test:crg-ab:summary -- --target src/runtime/conversationProcessor.ts --depth 2`

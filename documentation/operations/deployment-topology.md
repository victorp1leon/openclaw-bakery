# Bot Bakery Deployment and Network Topology

Status: MVP
Last Updated: 2026-02-26

## Reference topology (current target)

The runtime is designed for local/self-hosted operation, typically:
- Bot runtime: Node.js/TypeScript process (Linux VM)
- Model runtime: OpenClaw CLI (same VM process context)
- Model provider endpoint: LM Studio OpenAI-compatible API (commonly host machine, reachable from VM)
- Channel transport: Telegram Bot API (long polling) or local console
- Persistence: local SQLite (`BOT_DB_PATH`, default `bot.db`)
- External integrations (current/next): Google Sheets (`gws`), Trello, Netlify

## Logical flow

1. Channel message enters runtime (`console` or `telegram`).
2. Conversation runtime applies allowlist/guards and builds pending operation flow.
3. OpenClaw adapter invokes CLI and parses JSON output.
4. State/operations are persisted in SQLite.
5. Confirmed operations dispatch to tool adapters.

## Network boundaries

- Inbound:
  - Console mode: local stdin only
  - Telegram mode: no webhook endpoint required in MVP (outbound polling model)
- Outbound:
  - Telegram HTTPS API
  - OpenClaw provider endpoint (via OpenClaw profile/provider config)
  - External tool APIs (Sheets/Trello/Netlify) when enabled

## Security-relevant deployment notes

- Prefer VM network config that avoids unnecessary inbound exposure.
- Keep runtime-bound services on loopback where possible.
- Store secrets outside repository files.
- Ensure logs remain redacted (`pino` redact config in `src/index.ts`).

## Operational checks per environment

Before startup:
1. Validate env config (`npm run healthcheck`).
2. Confirm allowlist is populated for expected chat IDs.
3. Confirm DB path is writable.
4. Confirm channel credentials if using Telegram.
5. Confirm OpenClaw runtime settings (enabled/profile/timeout) match environment.

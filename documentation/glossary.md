# Bot Bakery Glossary

Status: MVP
Last Updated: 2026-02-26

## Domain terms
- `gasto`: expense registration command/intent.
- `pedido`: customer order command/intent.
- `web`: website generation/update command/intent.
- `ayuda`: help command/intent with usage examples.
- `tipo_envio`: order delivery type (`envio_domicilio` or `recoger_en_tienda`).
- `estado_pago`: payment status (`pagado`, `pendiente`, `parcial`).
- `sabor_pan`: cake base flavor enum.
- `sabor_relleno`: filling flavor enum.

## Conversation/runtime terms
- `allowlist`: authorized `chat_id` set allowed to use the bot.
- `pending`: chat-scoped operation waiting for missing data or confirmation.
- `confirmar`: explicit command to approve external execution.
- `cancelar`: explicit command to cancel a pending operation.
- `missing.ask_one`: policy of asking one missing field per turn.
- `operation_id`: unique identifier for a confirmable operation lifecycle.
- `idempotency_key`: deterministic key used to prevent duplicate side effects.
- `dedupe window`: time bucket used to collapse equivalent repeated requests.

## Architecture terms
- `Channel Adapter`: transport adapter (`console` / `telegram`) with no business logic.
- `Conversation Runtime`: orchestration layer for intent/parse/validate/confirm flow.
- `OpenClaw Adapter`: runtime wrapper for OpenClaw CLI + JSON extraction/failover classification.
- `State & Persistence`: SQLite-backed state/operations/idempotency storage.
- `Tool Adapter`: integration executor (Sheets, Trello, publish) triggered only after confirmation.
- `Config & Healthcheck`: env parsing and startup readiness reporting.

## Operations/security terms
- `strict mode`: runtime mode that tightens fallback behavior.
- `softfail`: controlled fallback on transient OpenClaw failures.
- `redaction`: masking/removal of secret/sensitive fields from logs.
- `runbook`: step-by-step operational response for common incidents.


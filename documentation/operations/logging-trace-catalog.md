# Bot Bakery Logging and Trace Catalog

Status: MVP
Last Updated: 2026-03-04

This catalog defines expected log events, fields, and safe-logging rules.

## Logger baseline
- Logger: `pino` (`src/index.ts`)
- Logging policy helper: `src/logging/loggingPolicy.ts`
- Redaction keys:
  - `*.token`
  - `*.secret`
  - `*.botToken`
  - `*.apiKey`
  - `headers.authorization`

## Event catalog

| Event / Message | Source | Level | Key Fields | Purpose |
|---|---|---|---|---|
| `runtime_config` | `src/index.ts` | `info` | `channel_mode`, `rate_limit.*`, `expense_tool.(dryRun,urlConfigured,apiKeyConfigured,apiKeyHeader,timeoutMs,maxRetries)`, `order_tool.trello.(dryRun,apiKeyConfigured,tokenConfigured,listIdConfigured,apiBaseUrl,timeoutMs,maxRetries)`, `order_tool.sheets.(dryRun,urlConfigured,apiKeyConfigured,apiKeyHeader,timeoutMs,maxRetries)`, `openclaw.*`, `telegram.*` | Startup configuration snapshot (sanitized). |
| `inbound_message` | `src/index.ts` | `info` | `event`, `channel`, `chat_id`, `text_preview` | Inbound traffic observability. |
| `conversation_trace` + `allowlist_reject` | `src/runtime/conversationProcessor.ts` | `info` | `event`, `chat_id`, `strict_mode`, `detail` | Unauthorized access attempts. |
| `conversation_trace` + `rate_limit_reject` | `src/runtime/conversationProcessor.ts` | `info` | `event`, `chat_id`, `strict_mode`, `detail` | Burst throttling events (`retry_after`). |
| `conversation_trace` + `intent_routed` | `src/runtime/conversationProcessor.ts` | `info` | `event`, `chat_id`, `intent`, `intent_source`, `detail` | Intent routing source/fallback context. |
| `conversation_trace` + `parse_succeeded` | `src/runtime/conversationProcessor.ts` | `info` | `event`, `chat_id`, `intent`, `intent_source`, `parse_source` | Parse success tracing. |
| `conversation_trace` + `parse_failed` | `src/runtime/conversationProcessor.ts` | `info` | `event`, `chat_id`, `intent`, `intent_source`, `parse_source`, `detail` | Parse failure and fallback diagnosis. |
| `conversation_trace` + `expense_execute_succeeded` | `src/runtime/conversationProcessor.ts` | `info` | `event`, `chat_id`, `intent`, `detail` | Expense connector execution success tracking. |
| `conversation_trace` + `expense_execute_failed` | `src/runtime/conversationProcessor.ts` | `info` | `event`, `chat_id`, `intent`, `detail` | Controlled expense connector failure diagnostics. |
| `conversation_trace` + `order_execute_succeeded` | `src/runtime/conversationProcessor.ts` | `info` | `event`, `chat_id`, `intent`, `detail` | Order connector execution success tracking (`create-card` + `append-order`). |
| `conversation_trace` + `order_execute_failed` | `src/runtime/conversationProcessor.ts` | `info` | `event`, `chat_id`, `intent`, `detail` | Controlled order connector failure diagnostics. |
| `Telegram polling started` | `src/channel/telegramChannel.ts` | `info` | `channel`, `pollIntervalMs`, `longPollTimeoutSeconds` | Telegram loop startup marker. |
| `Telegram update ignored (no text)` | `src/channel/telegramChannel.ts` | `info` | `channel`, `update_id`, `chat_id` | Unsupported Telegram message type observability. |
| `Telegram polling error` | `src/channel/telegramChannel.ts` | `warn` | `channel`, `err` | Polling resilience diagnostics. |
| `ALLOWLIST_CHAT_IDS vacío...` | `src/index.ts` | `warn` | _(message text)_ | Deny-by-default warning when allowlist is empty. |
| `Error procesando mensaje` | `src/index.ts` | `error` | `err` | Unhandled runtime processing error. |
| `No se pudo iniciar el canal` | `src/index.ts` | `error` | `err`, `channel` | Channel startup failure. |

## `conversation_trace` field schema
- `event: string`
- `chat_id: string`
- `strict_mode: boolean`
- `intent?: string`
- `intent_source?: string`
- `parse_source?: string`
- `detail?: string`

## Safe logging policy
- Do not log raw secrets/tokens/authorization headers.
- Use `text_preview` instead of full inbound text payload when possible.
- Keep user-visible errors generic; diagnostic detail belongs in logs/traces.
- Prefer stable event names for dashboards/alerts (`allowlist_reject`, `parse_failed`, etc.).

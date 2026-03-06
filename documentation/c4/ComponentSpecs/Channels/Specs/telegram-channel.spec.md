# Spec - telegramChannel

Status: MVP
Last Updated: 2026-02-26

## Objective
Consume Telegram messages (long polling) and send bot responses.
It must adapt Telegram transport only and must not include domain/business rules.

## Configuration Inputs
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_API_BASE_URL`
- `TELEGRAM_POLL_INTERVAL_MS`
- `TELEGRAM_LONG_POLL_TIMEOUT_SECONDS`

## Outputs
- Inbound callback emissions in shared runtime shape: `{ chat_id, text }`
- Outbound `sendMessage` delivery requests to Telegram Bot API
- Internal long-poll progress (`offset`) updates

## Rules
- Use `getUpdates` with increasing `offset` to avoid reprocessing messages.
- Process only text messages (ignore unsupported message types in v1).
- Convert `chat.id` to string for allowlist consistency.
- Log network errors without exposing the bot token.

## Error Handling Classification
- Retriable: network timeouts, transient Telegram API availability errors, temporary poll failures.
- Non-retriable: invalid/missing bot token, permanently invalid base URL/config errors.

## Security Constraints
- Do not log `TELEGRAM_BOT_TOKEN` or authorization-sensitive payload fragments.
- Preserve original `chat.id` value (as string) to avoid allowlist bypass via coercion.

## Idempotency / Dedupe
- Use monotonic `offset` progression to avoid duplicate inbound processing.
- Business-level dedupe/idempotency remains in runtime/state layers.

## Test Cases
- `polls_updates_and_emits_messages`
- `ignores_non_text_messages`
- `sends_message_via_sendMessage`

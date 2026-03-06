# Component Description - Channels

Status: MVP
Last Updated: 2026-02-26

## Responsibility
Adapt inbound/outbound channels to a shared runtime contract.

## Channels
- `consoleChannel`: local/manual testing
- `telegramChannel`: Telegram Bot API via long polling
- `channelFactory`: selects channel by configuration (`CHANNEL_MODE`)

## Shared Contract
- `start({ onMessage })`
- `sendMessage({ chatId, text })`
- `stop()` (when applicable)

## Rules
- Channel adapters must not contain business logic.
- They must preserve the original `chat_id` and message text.
- They should tolerate network errors with logging and reasonable retries (Telegram).

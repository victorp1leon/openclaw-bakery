> Migration Trace: Canonical copy generated from `documentation/c4/ComponentSpecs/Channels/Specs/channel-factory.spec.md` on 2026-03-23 (Wave C.1).
> Legacy C4 source path is preserved as historical trace metadata; files were retired in Wave C.2.

# Spec - channelFactory

Status: MVP
Last Updated: 2026-02-26

## Objective
Build the correct channel adapter according to `CHANNEL_MODE`.
It must only resolve channel wiring and must not implement business/runtime logic.

## Inputs
- `CHANNEL_MODE` configuration value
- Channel-specific dependencies/config (e.g., local chat id, Telegram config)

## Outputs
- `ChannelAdapter` instance for the selected mode
- Explicit configuration error for unsupported mode

## Rules
- `console` -> console channel
- `telegram` -> telegram channel
- unknown mode -> explicit error

## Error Handling Classification
- Retriable: none (factory is deterministic/config-driven).
- Non-retriable: unknown `CHANNEL_MODE` or invalid required channel config.

## Security Constraints
- Do not expose channel secrets/tokens in thrown errors or logs.
- Factory selection must not bypass runtime allowlist/confirmation guards.

## Idempotency / Dedupe
- Not applicable in this component (no external action execution).

## Test Cases
- `builds_console_channel`
- `builds_telegram_channel`
- `throws_on_unknown_mode`

> Migration Trace: Canonical copy generated from `documentation/c4/ComponentSpecs/Channels/Specs/console-channel.spec.md` on 2026-03-23 (Wave C.1).
> Legacy C4 source path is preserved as historical trace metadata; files were retired in Wave C.2.

# Spec - consoleChannel

Status: MVP
Last Updated: 2026-02-26

## Objective
Provide a local/manual channel adapter for development and testing via stdin/stdout.
It must provide transport behavior only and must not include business logic.

## Configuration Inputs
- `LOCAL_CHAT_ID` (or explicit constructor argument in adapter factory)

## Outputs
- Inbound callback emissions in shared runtime shape: `{ chat_id, text }`
- Outbound text written to stdout

## Rules
- Read one line per inbound message from stdin.
- Emit `{ chat_id, text }` to the shared channel callback using a stable local chat id.
- Print outbound text responses to stdout.
- Support `stop()` by closing the readline interface when present.
- Must not contain business logic (only transport adaptation).

## Error Handling Classification
- Retriable: transient stdin/stdout stream interruptions (caller can restart channel).
- Non-retriable: invalid initialization/runtime contract mismatch.

## Security Constraints
- Never print secrets by default; only user-visible runtime messages should be written.
- Keep local channel scope for development use only.

## Idempotency / Dedupe
- Not enforced at channel level; delegated to runtime/state layers.

## Test Cases
- `emits_inbound_messages_with_local_chat_id`
- `prints_outbound_messages_to_stdout`
- `closes_readline_on_stop`

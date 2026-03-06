# Spec - allowlistGuard

Status: MVP
Last Updated: 2026-02-26

## Objective
Parse and enforce allowlist access control by `chat_id` before any conversation processing occurs.
It must only enforce access control and must not perform intent/tool logic.

## Components / Functions
- `parseAllowedChatIds(raw)`
- `isAllowedChat(chat_id, allowedChatIds)`

## Inputs
- `raw?: string` allowlist source (`ALLOWLIST_CHAT_IDS`)
- `chat_id: string`
- `allowedChatIds: Set<string>`

## Outputs
- `Set<string>` parsed allowlist
- `boolean` authorization decision

## Rules
- Parse comma-separated `ALLOWLIST_CHAT_IDS` into a trimmed set of string IDs.
- Ignore empty entries and whitespace-only values.
- Matching is exact string match (no numeric coercion at guard level).
- Runtime callers must evaluate allowlist before intent parsing or tool execution.

## Error Handling Classification
- Retriable: not applicable (deterministic parse/check).
- Non-retriable: malformed input is normalized to safe deny behavior (empty allowlist or non-match).

## Security Constraints
- Deny-by-default behavior should apply when allowlist is empty or missing.
- Guard result must gate runtime flow before parsing/confirmation/tool execution.

## Idempotency / Dedupe
- Not applicable in this component (authorization gate only).

## Test Cases
- `parses_comma_separated_chat_ids`
- `ignores_empty_allowlist_entries`
- `allows_exact_chat_id_match`
- `rejects_non_listed_chat_id`

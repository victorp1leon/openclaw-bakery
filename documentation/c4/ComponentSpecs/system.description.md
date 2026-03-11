# System Description (C4 - Container Level)

Status: MVP
Last Updated: 2026-03-09

## System
`OpenClaw Bakery Bot` (`bot-bakery`) is a Node.js/TypeScript application that provides a conversational assistant for bakery business operations.

## Stack
- Runtime: Node.js + TypeScript
- LLM runtime: OpenClaw (local CLI)
- Model provider: OpenAI-compatible provider (LM Studio on host machine)
- Validation: Zod
- State: SQLite
- Testing: Vitest
- Channels: console, Telegram Bot API (long polling)

## Main Containers / Building Blocks
1. `Channel Adapters`
- Receives messages from console/Telegram and sends responses back.

2. `Conversation Runtime`
- Orchestrates `allowlist -> rate-limit -> intent -> parse -> validate -> missing -> confirm/cancel -> tool execution`.

3. `OpenClaw Adapter`
- Invokes OpenClaw CLI and extracts structured JSON from its responses.

4. `State & Persistence`
- Stores conversation state, operations, and idempotency records in SQLite.

5. `Tool Adapters`
- Integrates with Sheets, Trello, and web publishing targets (including read-only order reports and order lookup via Sheets `gws`).

6. `Config & Healthcheck`
- Loads normalized runtime configuration and emits startup readiness checks.

## Data Flow
1. A message (`chat_id`, text) arrives from a channel.
2. The allowlist gate validates access.
3. The rate-limit guard throttles bursts per `chat_id`.
4. The runtime determines whether the message is a confirmation/cancellation or a new request.
5. The intent router classifies the capability.
6. The parser builds JSON (OpenClaw + local heuristic fallback).
7. Guards validate, normalize, and request missing fields when needed.
8. The runtime builds a summary + `operation_id`.
9. After confirmation, the tool executor invokes external integrations.
10. State/result and idempotency records are persisted.

## Conversation Runtime L3 Components (Reference)
- `conversationProcessor`
- `allowlistGuard`
- `rateLimitGuard`
- `intentRouter`
- `parser`
- `validationGuard`
- `missingFieldPicker`
- `confirmationGuard`
- `dedupeGuard`
- `toolExecutor` (or equivalent inlined orchestration)
- `stateStore` / `operationsStore` persistence adapters

## External Dependencies
- Telegram Bot API
- OpenClaw CLI (local)
- LM Studio (host-only network)
- Google Workspace CLI (`googleworkspace/cli`) for Sheets access
- Trello REST API
- Hosting target (e.g., Netlify)

## Internal Code Layers
- `src/channel/*`
- `src/runtime/*`
- `src/skills/*`
- `src/guards/*`
- `src/openclaw/*`
- `src/state/*`
- `src/tools/*`
- `src/config/*`, `src/health/*`

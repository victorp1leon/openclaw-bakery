# ADR-004: Use Telegram Long Polling for Channel Ingress in MVP

Status: Accepted
Last Updated: 2026-02-26

## Context
The bot needs Telegram channel support with minimal infrastructure and secure startup behavior.

## Decision
Use Telegram Bot API long polling (`getUpdates`) in MVP instead of webhook hosting.

## Consequences
- Pros:
  - No public inbound webhook endpoint required.
  - Simpler local/VM setup and troubleshooting.
  - Natural fit for current deployment topology.
- Cons:
  - Polling loop management/retry handling required.
  - Potentially less efficient than webhooks at larger scale.


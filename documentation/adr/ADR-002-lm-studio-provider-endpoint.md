# ADR-002: Use LM Studio OpenAI-Compatible Endpoint as Local Model Provider

Status: Accepted
Last Updated: 2026-02-26

## Context
The project targets local/self-hosted operation and requires a model endpoint reachable from the bot runtime.

## Decision
Use LM Studio OpenAI-compatible API as the primary model provider endpoint for OpenClaw in local/VM setups.

## Consequences
- Pros:
  - Local control over model selection and runtime behavior.
  - Works with OpenAI-compatible client patterns.
  - Supports development without external hosted LLM dependency.
- Cons:
  - Availability depends on local host/VM network setup.
  - Requires operational checks for endpoint reachability and performance.


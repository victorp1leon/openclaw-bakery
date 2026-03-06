# ADR-001: Use OpenClaw as the LLM Runtime Adapter Layer

Status: Accepted
Last Updated: 2026-02-26

## Context
The bot must interpret free-form Spanish chat input into structured payloads while keeping deterministic business control in runtime guards.

## Decision
Use OpenClaw CLI as the LLM runtime interface, wrapped by an internal adapter that:
- invokes OpenClaw in JSON mode,
- extracts JSON from variable output formats,
- classifies transient vs non-transient errors.

## Consequences
- Pros:
  - Swappable LLM orchestration boundary.
  - Better resilience handling via adapter normalization.
  - Clear separation between interpretation and policy enforcement.
- Cons:
  - Added runtime dependency and CLI invocation overhead.
  - Need explicit handling for malformed/non-JSON payloads.


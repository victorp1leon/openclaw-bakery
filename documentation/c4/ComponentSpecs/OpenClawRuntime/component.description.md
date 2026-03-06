# Component Description - OpenClaw Runtime Adapter

Status: MVP
Last Updated: 2026-02-26

## Responsibility
Encapsulate OpenClaw CLI invocation, response JSON extraction, and transient error classification.

## Components
- `runtime.ts`: invokes `openclaw agent --local --json`
- `jsonExtract.ts`: extracts usable JSON from textual payloads
- `failover.ts`: detects timeout/aborted/rate-limit/network issues for controlled fallback

## Design Goal
Keep OpenClaw as a swappable dependency and protect the runtime from variable output formats.

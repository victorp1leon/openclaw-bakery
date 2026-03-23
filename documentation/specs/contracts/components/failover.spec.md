> Migration Trace: Canonical copy generated from `documentation/c4/ComponentSpecs/OpenClawRuntime/Specs/failover.spec.md` on 2026-03-23 (Wave C.1).
> Legacy C4 source path is preserved as historical trace metadata; files were retired in Wave C.2.

# Spec - failover (transient detection)

Status: MVP
Last Updated: 2026-02-26

## Objective
Classify transient errors so callers can apply safe fallback without treating permanent failures as retriable.
It must classify error category only and must not execute fallback/tool logic itself.

## Inputs
- OpenClaw/runtime error object or normalized error metadata
- strict/softfail mode flags from caller context

## Outputs
- transient classification decision
- normalized reason/category suitable for caller policy handling

## Rules
- Transient: timeout, aborted/request aborted, rate limit, selected network errors.
- Non-transient: persistent invalid JSON, schema mismatch, invalid auth.
- The caller decides whether fallback applies based on `OPENCLAW_STRICT_SOFTFAIL`.

## Error Handling Classification
- Retriable: transient categories only.
- Non-retriable: malformed/auth/schema categories and persistent invalid output.

## Security Constraints
- Error classification must preserve redaction; do not expose secrets from stderr/context.

## Idempotency / Dedupe
- Not applicable in this component (error classification only).

## Test Cases
- `detects_timeout_as_transient`
- `detects_aborted_as_transient`
- `does_not_mark_invalid_json_as_transient`

> Migration Trace: Canonical copy generated from `documentation/c4/ComponentSpecs/OpenClawRuntime/Specs/openclaw-runtime.spec.md` on 2026-03-23 (Wave C.1).
> Legacy C4 source path is preserved as historical trace metadata; files were retired in Wave C.2.

# Spec - openclaw runtime adapter

Status: MVP
Last Updated: 2026-02-26

## Objective
Execute OpenClaw CLI with the configured timeout/profile/model options and return structured output or a classified error.
It must encapsulate runtime invocation and must not make business authorization decisions.

## Inputs
- prompt/request payload for OpenClaw
- runtime config (`OPENCLAW_ENABLE`, profile, timeout, thinking options)

## Outputs
- structured OpenClaw response payload
- normalized invocation/classification errors for caller policy handling

## Rules
- Respect `OPENCLAW_ENABLE`, `OPENCLAW_PROFILE`, `OPENCLAW_TIMEOUT_SECONDS`, `OPENCLAW_THINKING`.
- Invoke in `--local --json` mode.
- Do not log full prompts or secrets.
- Propagate stderr/errors for diagnostics with redaction.

## Error Handling Classification
- Retriable: timeout, aborted, rate-limit, transient connectivity/runtime process failures.
- Non-retriable: invalid auth/configuration, persistent malformed outputs, hard invocation errors.

## Security Constraints
- Enforce secret redaction in logs/stderr surfaces.
- Keep runtime invocation bounded by configured timeout.

## Idempotency / Dedupe
- Not applicable in this component (invocation layer only).

## Test Cases
- `returns_parsed_json_payload_on_success`
- `times_out_and_marks_transient`

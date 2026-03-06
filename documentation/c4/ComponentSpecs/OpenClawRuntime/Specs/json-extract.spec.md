# Spec - jsonExtract

Status: MVP
Last Updated: 2026-02-26

## Objective
Extract valid JSON from OpenClaw responses (plain payload text, fenced markdown code blocks, or mixed text).
It must parse/extract JSON only and must not validate business schema or execute actions.

## Inputs
- raw OpenClaw textual payload

## Outputs
- extracted JSON object/string parse result
- explicit parse failure when no valid JSON can be extracted

## Rules
- Try direct JSON parsing first.
- Support fenced ```json ... ``` blocks.
- Extract the first reasonable JSON object when the model adds extra text.
- Throw a clear error if no usable JSON is present.

## Error Handling Classification
- Retriable: upstream may retry when extraction fails due to transient malformed model output.
- Non-retriable: deterministically non-JSON payloads after extraction attempts.

## Security Constraints
- Extraction logic must avoid logging full sensitive payloads by default.
- Output remains untrusted until validated by runtime guards.

## Idempotency / Dedupe
- Not applicable in this component (parsing helper only).

## Test Cases
- `extracts_json_from_plain_text`
- `extracts_json_from_markdown_code_block`
- `throws_when_no_json_found`

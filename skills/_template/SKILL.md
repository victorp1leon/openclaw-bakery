---
name: your-skill-name
description: Use when a specific trigger appears and this skill can produce a constrained, reusable outcome.
---

# skill: your-skill-name

## Overview
One paragraph describing the exact goal and boundaries of this skill.

## When To Use
- Trigger 1
- Trigger 2
- Trigger 3

## When Not To Use
- Case 1 outside this scope
- Case 2 where another skill/process should be used

## Input Contract
- Expected input format/language
- Required entities/fields if any
- Optional context

## Output Contract
- Expected output format (JSON/text/checklist)
- Mandatory fields/sections
- Allowed status values

## Workflow
1. Parse input and classify intent.
2. Validate required fields.
3. Ask for exactly one missing field if needed.
4. Produce final output and ask for explicit confirmation when applicable.

## Safety Constraints
- Do not trigger external side effects directly.
- Preserve idempotency and confirmation gates.
- Keep responses deterministic and machine-parseable when required.

## Common Mistakes
- Returning free text when strict output format is required.
- Asking for multiple missing fields in one turn.
- Executing external operations without confirmation.

## Quick Example
```json
{
  "intent": "example.intent",
  "operation": {
    "operation_id": "uuid-v4",
    "idempotency_key": "sha256",
    "status": "needs_missing"
  },
  "payload": {},
  "missing": ["required_field"],
  "asked": "required_field",
  "reply": "Pregunta corta para el campo faltante"
}
```

## References
- `AGENTS.md`
- `documentation/ai_implementation/implementation-instructions.md`

---
applyTo: '**/*'
description: Standardize commit messages in OpenClaw Bakery using Conventional Commits with practical scopes for runtime, platform, docs, and security work.
---

# Conventional Commits Instruction

## Purpose
Maintain a readable and automatable history for releases, debugging, and collaboration.

## Format
Use:

```text
<type>[optional scope]: <description>
```

## Allowed Types
- `feat`
- `fix`
- `docs`
- `refactor`
- `test`
- `chore`
- `ci`
- `build`
- `perf`
- `revert`

## Scope Guidance
Use a scope when it clarifies impact:
- `runtime`
- `skills`
- `tools`
- `state`
- `openclaw`
- `channel`
- `docs`
- `security`
- `ops`

## Rules
- Keep subject line imperative and concise.
- Do not end subject with a period.
- Keep first line at or under 72 chars.
- One commit should represent one logical change unit.
- For breaking changes, use `!` and explain in body.

## Examples
- `feat(runtime): add missing-field prompt normalization`
- `fix(tools): handle sheets timeout retries`
- `docs(ai-collab): add handoff for skill migration`
- `test(skills): cover order parser edge cases`

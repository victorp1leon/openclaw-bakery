---
applyTo: '.github/instructions/*.instructions.md'
description: Standard for creating and maintaining instruction files in OpenClaw Bakery with consistent frontmatter, structure, and enforceable rules.
---

# Meta-Instruction Standard

## Purpose
Define the required format and quality bar for instruction files used in this repository.

## Mandatory Frontmatter
Each instruction file must include YAML frontmatter with:
- `applyTo`: file glob where the rule applies.
- `description`: short actionable summary of the instruction intent.

## Required Structure
Each instruction should include these sections:
1. Title (`# ...`)
2. Purpose
3. Rules (explicit and verifiable)
4. Best Practices (optional but recommended)
5. References (repo paths when available)

## Writing Rules
- Use clear imperative language: `Do`, `Use`, `Avoid`.
- Keep scope specific; avoid generic advice with no enforcement.
- Prefer repository-local references over external links.
- State toolchain assumptions explicitly when relevant.
- Keep rules compatible with:
  - `AGENTS.md`
  - `documentation/ai_implementation/implementation-instructions.md`
  - `documentation/ai_collaboration/codex-collaboration-playbook.md`

## Validation Checklist
- [ ] File is under `.github/instructions/`.
- [ ] Filename ends with `.instructions.md`.
- [ ] Frontmatter has `applyTo` and `description`.
- [ ] Rules are actionable and testable.
- [ ] References point to existing paths in this repo.

## Minimal Example
```markdown
---
applyTo: 'src/runtime/**/*.ts'
description: Require explicit confirmation checks before mutating operations.
---

# Example Runtime Safety Instruction

## Purpose
Prevent unconfirmed mutating actions.

## Rules
- Validate confirmation gate before executing external writes.
- Preserve idempotency checks for retried operations.
```

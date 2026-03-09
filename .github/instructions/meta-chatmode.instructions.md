---
applyTo: '.github/chatmodes/*.chatmode.md'
description: Standard for defining chatmodes in OpenClaw Bakery, including scope, structure, and activation expectations.
---

# Meta-Chatmode Standard

## Purpose
Define how to write chatmode files that adjust assistant behavior for specific workflows without conflicting with repository rules.

## When To Create A Chatmode
- Create chatmodes only when explicitly needed for a recurring workflow.
- Do not create chatmodes for one-off tasks.
- Keep the number of chatmodes minimal and role-focused.

## File Conventions
- Location: `.github/chatmodes/`
- Name format: `{role}.chatmode.md` (example: `architect.chatmode.md`)
- Each file should include YAML frontmatter with at least:
  - `description`
  - `tools` (optional, if specific tools are required)

## Required Sections
1. Title (`# ...`)
2. Purpose
3. Expected Behavior
4. Constraints
5. Example Usage
6. References

## Chatmode Rules
- Chatmode instructions must align with `AGENTS.md` and project safety constraints.
- Define priorities explicitly (for example: findings-first review, plan-before-code).
- Avoid contradictory instructions across chatmodes.
- Keep outputs practical and implementation-oriented for this repo.

## Validation Checklist
- [ ] File name follows `{role}.chatmode.md`.
- [ ] Behavior and constraints are concrete.
- [ ] References point to repo docs or instructions.
- [ ] No conflicts with existing instructions or safety rules.

## Example Skeleton
```markdown
---
description: Architect mode for planning and technical trade-off analysis.
tools:
  - read_file
  - search
---

# Architect Chatmode

## Purpose
Plan before implementation.

## Expected Behavior
- Gather context from specs and plans.
- Propose a step-by-step implementation path.

## Constraints
- Do not edit code unless explicitly requested.
```

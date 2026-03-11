---
name: docs-plan-handoff
description: Maintain collaboration artifacts for complex tasks. Use when work requires creating or updating plans, plans index entries, and session handoff notes.
---

# docs-plan-handoff

## Workflow
1. Decide if a plan is mandatory.
- Create/update plan when the task is multi-file, multi-session, architecture-affecting, integration-affecting, or a formal review.
- Keep status transitions explicit: `Not Started` -> `In Progress` -> `Complete` (or `Blocked`).

2. Update the implementation plan artifact.
- Use template at:
  - `documentation/ai_collaboration/plans/_plan-template.md`
- Ensure:
  - `Cross-References` include related specs/docs.
  - `Approach` rows reflect real execution state.
  - `Validation` contains concrete commands.

3. Update plans index.
- File:
  - `documentation/ai_collaboration/plans/_index.md`
- Keep:
  - `Last Updated` date current.
  - Active/completed tables aligned with plan status.

4. Write a session handoff.
- Template:
  - `documentation/ai_collaboration/plans/_session-handoff-template.md`
- Place under:
  - `documentation/ai_collaboration/plans/<domain>/sessions/`
- Include:
  - what changed
  - current state
  - open issues
  - next steps

5. Cross-check consistency.
- Plan status, index row, and handoff must all agree on current state.

## Guardrails
- Do not mark a plan complete if validation steps were not executed (or explicitly marked as pending limitations).
- Keep handoffs short, factual, and actionable.
- Preserve historical accuracy; do not rewrite old plan outcomes.

## Quick Commands
- Show active plans:
  - `sed -n '1,220p' documentation/ai_collaboration/plans/_index.md`
- List recent runtime handoffs:
  - `ls -1 documentation/ai_collaboration/plans/runtime/sessions | tail -n 10`
- List recent platform handoffs:
  - `ls -1 documentation/ai_collaboration/plans/platform/sessions | tail -n 10`

---
name: grill-me
description: Run a focused, high-rigor design interview to stress-test a plan before implementation. Use when the user asks to be "grilled", wants to challenge architecture/trade-offs, or needs confidence that open decisions and risks are resolved.
---

# grill-me

## Workflow
1. Frame the review.
- Ask for one concrete target (feature/plan/change) and expected outcome.
- Confirm scope boundaries (what is in vs out).

2. Gather objective context first.
- If answers are available in docs/code, inspect them before asking the user.
- Prefer evidence-backed questions, not hypothetical branching without data.

3. Run time-boxed interview rounds.
- Use up to 3 rounds by default.
- Ask up to 5 high-impact questions per round.
- Prioritize this order: correctness -> safety/data integrity -> operability -> maintainability -> delivery speed.

4. Resolve decisions explicitly.
- For each answered question, mark one of:
  - `decided`
  - `assumption`
  - `open`
- Track dependencies between decisions so unresolved upstream choices stay visible.

5. Stop when closure criteria are met.
- Stop early when all critical decisions are `decided` or accepted `assumption`.
- If critical items remain `open`, stop after round limit and provide clear unblock actions.

6. Produce mandatory closeout summary.
- Return:
  - objective reviewed
  - decisions locked
  - assumptions accepted
  - open decisions (if any)
  - top risks with severity (`high|medium|low`)
  - recommended next step (`implement` or `spec/plan update first`)

## Guardrails
- Do not ask repetitive questions already answered in-session.
- Do not exceed round limits unless the user explicitly asks to continue.
- Keep tone firm but collaborative; challenge decisions, not people.
- Do not start implementation from this skill; hand off to implementation flow only after closure.
- If task scope is complex (multi-file or multi-session), recommend updating plan/handoff artifacts before implementation.

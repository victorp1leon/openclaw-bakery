---
name: git-commit
description: Prepare and create clean git commits in this repository when the user asks to commit changes. Use for staging selected files, writing a conventional commit message, validating what is being committed, and confirming final repo status.
---

# git-commit

## Workflow
1. Check working tree state.
- Run `git status --short`.
- Run `git diff --name-status` when changes need quick classification.

2. Review changes to include.
- Inspect relevant diffs with `git diff -- <path>`.
- Exclude generated artifacts unless the user explicitly wants them.
- If `src/runtime/conversationProcessor.ts` or `src/tools/` changed, run:
  - `npm run check:intent-skills`

3. Stage intentionally.
- Stage explicit files (`git add <path...>`), not broad wildcards by default.
- Re-check with `git status --short`.

4. Commit with conventional style.
- Use format: `<type>: <summary>`.
- Common types: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`.
- Example: `git commit -m "fix: harden trello lookup fallback"`.

5. Verify result.
- Run `git log -1 --oneline`.
- Confirm clean tree with `git status --short`.

## Guardrails
- Do not amend/rebase/reset unless the user explicitly requests it.
- Do not include secrets (`.env`, tokens, credentials).
- If unrelated local changes exist, avoid mixing them into the same commit unless requested.
- If commit fails due to hooks/lint/tests, report the failure and exact blocker.

## Output Pattern
- Report commit hash.
- Report commit message.
- Report whether tree is clean.

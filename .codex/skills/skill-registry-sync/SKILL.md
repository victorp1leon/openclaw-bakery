---
name: skill-registry-sync
description: Maintain a deterministic local registry of project operational assets (skills, rules, agents, and instructions) to prevent cross-session drift. Use when files are added, removed, or renamed under `.codex/skills`, `.codex/rules`, `.github/agents`, or `.github/instructions`, and before closing a collaboration session that changed these artifacts.
---

# skill-registry-sync

## Workflow
1. Collect source files.
- Skills:
  - `find .codex/skills -mindepth 2 -maxdepth 2 -type f -name 'SKILL.md' | sort`
- Rules:
  - `find .codex/rules -maxdepth 1 -type f -name '*.md' ! -name 'README.md' | sort`
- Agents:
  - `find .github/agents -maxdepth 1 -type f -name '*.md' | sort`
- Instructions:
  - `find .github/instructions -maxdepth 1 -type f -name '*.md' | sort`

2. Extract minimal metadata.
- For each skill file, read frontmatter keys `name` and `description` only.
- For rules/agents/instructions, use filename and path.
- If any `SKILL.md` is missing valid frontmatter, stop and report the file.

3. Rebuild registry file from scratch.
- Target file: `.codex/skill-registry.md`
- Overwrite the whole file on each run (do not patch partial sections).
- Use this section order:
  - `# Skill Registry`
  - `Generated At (UTC)`
  - `## Skills` table (`Name | Description | Path`)
  - `## Rules` table (`Rule | Path`)
  - `## Agents` table (`Agent | Path`)
  - `## Instructions` table (`Instruction | Path`)
- Keep entries sorted lexicographically by path for stable diffs.

4. Run drift checks.
- Ensure every discovered file is listed exactly once.
- Ensure every listed path exists.
- Ensure there are no duplicate skill names or duplicate paths.

5. Sync collaboration artifacts when needed.
- If the registry changed because skills/rules were added or removed, mention that update in the session handoff for traceability.

## Guardrails
- Do not modify runtime/business code as part of this workflow.
- Do not infer missing metadata; report malformed files explicitly.
- Keep output ASCII and repo-relative paths only.
- Keep the process deterministic; repeated runs without file changes must produce no diff.

## Quick Commands
- Preview skill metadata:
  - `for f in $(find .codex/skills -mindepth 2 -maxdepth 2 -type f -name 'SKILL.md' | sort); do echo "### $f"; sed -n '1,20p' "$f"; echo; done`
- List duplicate skill names:
  - `for f in $(find .codex/skills -mindepth 2 -maxdepth 2 -type f -name 'SKILL.md'); do sed -n 's/^name:[[:space:]]*//p' "$f"; done | sort | uniq -d`
- List missing registry paths:
  - `awk -F'|' '/\\|[[:space:]]*\\.\\// {gsub(/^[[:space:]]+|[[:space:]]+$/, "", $3); print $3}' .codex/skill-registry.md | while read -r p; do [ -e "$p" ] || echo "MISSING $p"; done`

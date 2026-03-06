# AI Collaboration Playbook

> A practical guide to setting up a structured collaboration system between developers and AI coding agents. Built for Cursor IDE but the principles apply to any AI-assisted development workflow.

---

## The Problem

Every new AI conversation starts with zero memory. Without a system in place, you waste time and tokens re-explaining architecture, re-describing patterns, and re-establishing context that existed in previous sessions. The AI makes inconsistent decisions because it doesn't know what was decided before.

## The Solution

A layered context system where information is organized by how frequently it's needed and how it should be delivered to the AI:

| Layer | What It Contains | How It's Delivered | Token Cost |
|-------|-------------------|--------------------|------------|
| **Rules** | Patterns, standards, conventions | Auto-injected by Cursor | Near zero (loaded automatically) |
| **System Map** | Platform overview, services, connections | Read on demand | Low (one small file) |
| **Repo Guides** | Per-repo orientation | Auto-injected when in that repo | Near zero |
| **Plans** | Task-specific context, specs, approach | Read when starting related work | Medium (targeted reads) |
| **Session Handoffs** | What happened last session, next steps | Read at start of continuation work | Very low (~15 lines) |

---

## Workspace Structure

The system requires a **shared workspace folder** that sits alongside your code repositories. This folder is not a git repo -- it's a workspace-level collaboration hub that the AI can always access regardless of which repo you're working in.

```
{workspace-root}/
├── {Shared Docs Folder}/                 # AI collaboration hub (not a git repo)
│   ├── .cursor/rules/                    # Cross-repo Cursor rules
│   │   ├── {project}-plans-and-docs.mdc      # Where to find everything (alwaysApply: true)
│   │   ├── {project}-workflow.mdc            # Research-Plan-Implement cycle (alwaysApply: true)
│   │   ├── {domain}-standards.mdc            # Domain-specific standards (globs: **/*.cs)
│   │   ├── {project}-patterns.mdc            # Common code patterns (globs: **/*.cs)
│   │   └── {project}-messaging.mdc           # Messaging/integration patterns (globs: **/*.cs)
│   ├── system-map.md                     # Platform-wide service map
│   ├── Plans/
│   │   ├── _index.md                     # Master plan list with status and links
│   │   ├── _plan-template.md             # Template for new plans
│   │   ├── _session-handoff-template.md  # Template for end-of-session snapshots
│   │   ├── Platform/                     # Cross-cutting plans
│   │   └── Services/
│   │       └── {ServiceName}/
│   │           ├── implementations/
│   │           ├── reviews/
│   │           ├── refactoring/
│   │           ├── diagrams/
│   │           ├── investigations/
│   │           └── sessions/             # Session handoff notes
│   └── Documentation/                    # Reference docs the AI can read
│       └── Docs for context/             # Standards, TDDs, reviews, etc.
│
└── repos/                                # Git repositories
    ├── {ServiceA}/
    │   └── .cursor/rules/repo-guide.mdc  # Repo-specific orientation
    ├── {ServiceB}/
    │   └── .cursor/rules/repo-guide.mdc
    └── ...
```

---

## Layer 1: Cursor Rules

Rules are `.mdc` files in `.cursor/rules/` that Cursor auto-injects into every AI conversation based on scope. They're the cheapest form of context -- the AI receives them without reading any files.

### Types of Rules

**Cross-repo rules** (in the shared docs folder):

| Rule | Scope | Purpose |
|------|-------|---------|
| Plans & docs locator | `alwaysApply: true` | Tells the AI where to find plans, specs, handoffs, system map |
| Development workflow | `alwaysApply: true` | Enforces Research-Plan-Implement-Close cycle |
| Code patterns | `globs: "**/*.{ext}"` | Common patterns: DI registration, entry points, project structure |
| Domain standards | `globs: "**/*.{ext}"` | API standards, error formats, naming conventions |
| Messaging patterns | `globs: "**/*.{ext}"` | Integration patterns: queues, contracts, retry strategies |

**Per-repo rules** (in each git repo):

| Rule | Scope | Purpose |
|------|-------|---------|
| Repo guide | `alwaysApply: true` | What this service does, entry point, key files, connections, links to specs |

### Writing Effective Rules

- **Be concrete, not vague.** "Use early returns instead of nested if blocks" works. "Write clean code" gets ignored.
- **Use imperative voice.** "Always use X" not "It's recommended to use X."
- **Include micro-examples.** Show 2-3 lines of correct vs. incorrect code.
- **Keep each rule under 50 lines.** Split large rules into focused files.
- **Use globs to scope.** Only load rules when they're relevant to the files being edited.
- **Don't duplicate.** If it's in a rule, don't also put it in a plan. Reference instead.

### Repo Guide Template

```markdown
---
description: {ServiceName} repo orientation
alwaysApply: true
---

# {ServiceName} Repo Guide

{One sentence: what this service does.}

## Entry Point
- `path/to/Program.cs` ({service type} via {builder pattern})

## Key Files
- `path/to/Controller.cs` -- {what it does}
- `path/to/Service.cs` -- {what it does}
- `path/to/Configuration.cs` -- {what it does}

## Connects To
- **Inbound**: {who calls this service}
- **Outbound**: {what this service calls}

## Specs & Plans
- Specs: `path/to/specs/`
- Plans: `path/to/plans/`
```

---

## Layer 2: System Map

A single markdown file at the root of your shared docs folder that describes the entire platform: services, how they connect, which queues exist, what databases are used, and the current development status of each component.

### What to include

- **Architecture diagram** (ASCII art showing the flow between layers)
- **Service registry** (table per layer: service name, type, key dependencies, repo, status)
- **Queue/messaging topology** (which queues exist, who publishes, who consumes)
- **Shared infrastructure** (libraries, managed services, config systems)
- **Event flow paths** (the 2-3 main paths data takes through the system)

### Why it matters

When the AI needs cross-service context (e.g., "how does this callback reach the workflow engine?"), one read of the system map answers it. Without this file, the AI would need to explore multiple repos and piece it together -- expensive in both tokens and time.

### Maintenance

Update the system map when:
- A new service is added
- A service's status changes (planned -> in development -> production)
- Messaging topology changes (new queues, new publishers/consumers)

---

## Layer 3: Plans

Plans are structured markdown files that provide deep context for specific tasks. They're more detailed than rules but only read when relevant.

### When to create a plan

| Situation | Create a plan? |
|-----------|----------------|
| Multi-session implementation (new service, new feature) | Yes |
| Code review with structured findings | Yes |
| Refactoring with scope and migration steps | Yes |
| C4 diagram or architecture documentation | Yes |
| Quick bug fix or one-liner | No |
| Simple question about the codebase | No |

### Plan template

Every plan follows the same structure for consistency:

```markdown
# [Plan Title]

> **Type:** `[Implementation | Review | Refactoring | Diagram | Investigation]`
> **Status:** `[Not Started | In Progress | Blocked | Complete | Cancelled]`
> **Created:** `YYYY-MM-DD`
> **Last Updated:** `YYYY-MM-DD`

## Cross-References
| Document | Path | Purpose |
|----------|------|---------|

## Context
{2-3 sentences: what, why, what problem}

## Scope
### In Scope / ### Out of Scope

## Approach
### Steps
| # | Step | Status | Notes |
|---|------|--------|-------|

## Decisions & Trade-offs
| Decision | Rationale | Date |
|----------|-----------|------|

## Outcome
{Fill in when complete}
```

### Plans index

A `_index.md` file serves as the master list. It has two tables -- Active Plans and Completed Plans -- each linking to the plan file. The AI reads this first to find relevant context for any task.

---

## Layer 4: Session Handoffs

The highest-impact, lowest-effort artifact. At the end of a working session, the AI writes a 10-15 line snapshot that captures exactly what the next conversation needs to know.

### Session handoff template

```markdown
# Session Handoff: [Service/Task] - [Date]

> **Service:** `[ServiceName or "Platform"]`
> **Plan:** `[Link to related plan, if any]`
> **Date:** `YYYY-MM-DD`

## What Was Done
- {Bullet list of completed work}

## Current State
- {What's working, what's partially done}

## Open Issues
- {Bugs, blockers, unresolved questions}

## Next Steps
- {What to pick up next session}

## Key Decisions
- {Decisions that affect future work}
```

### Why this works

A new AI conversation reading a 15-line handoff gets the same context that would otherwise require re-reading hundreds of lines of code, specs, and plans. It's the most token-efficient form of continuity.

---

## Layer 5: Development Workflow Rule

A rule that enforces a consistent four-phase cycle for complex tasks:

### Phase 1: Research
1. Read the plans index for existing plans
2. Check for session handoffs
3. Read the repo guide for orientation
4. Explore the codebase to understand current state
5. Read the system map if cross-service context is needed

### Phase 2: Plan
1. Present the approach before writing code
2. Create a plan for complex tasks
3. Wait for user approval before implementing

### Phase 3: Implement
1. Follow existing patterns from reference implementations
2. Include or update tests when modifying business logic
3. Check for linter errors after edits

### Phase 4: Close
1. Write a session handoff for multi-session work
2. Update plan status and the plans index

This cycle is encoded as a Cursor rule with `alwaysApply: true` so the AI follows it automatically without being asked.

---

## Setting This Up From Scratch

### Step 1: Create the shared docs folder

Create a folder alongside your repos (not inside any repo). Add it to your Cursor workspace.

### Step 2: Create the cross-repo rules

In `{shared-docs}/.cursor/rules/`, create:
1. A plans-and-docs locator rule (`alwaysApply: true`) listing where everything lives
2. A workflow rule (`alwaysApply: true`) enforcing Research-Plan-Implement-Close
3. Domain-specific rules (scoped via `globs`) for your coding standards and patterns

### Step 3: Create the system map

Write `system-map.md` with your architecture diagram, service registry, messaging topology, and event flow paths. Keep it under 150 lines.

### Step 4: Set up the plans folder

Create `Plans/_index.md`, `Plans/_plan-template.md`, and `Plans/_session-handoff-template.md`. Create subfolders for your services and plan types.

### Step 5: Add repo guides

In each service repo, create `.cursor/rules/repo-guide.mdc` with `alwaysApply: true`. Keep each under 30 lines: what the service does, entry point, key files, connections, links to specs.

### Step 6: Start working

On your first complex task, the AI will follow the workflow rule: research existing context, propose a plan, implement with your approval, and write a handoff at the end. Each subsequent session benefits from everything that came before.

---

## Key Principles

1. **Rules for recurring patterns, plans for specific tasks.** Don't put task-specific context in rules. Don't put recurring patterns only in plans.

2. **Less context is better than more.** Compress, don't append. A 15-line handoff beats a 500-line transcript.

3. **Auto-inject when possible.** Rules with `alwaysApply: true` and repo guides cost zero effort from the developer. The AI gets them without anyone doing anything.

4. **Single source of truth.** The plans index is the one place to find all plans. The system map is the one place to understand the platform. Don't scatter the same information across multiple files.

5. **Keep it maintainable.** Update the system map when services change. Move completed plans to the completed table. Delete stale handoffs. A stale system is worse than no system because the AI will trust outdated information.

---

*Version: 1.0 -- February 2026*

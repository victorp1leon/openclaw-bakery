# Feature Spec Package Template

Use this template to scaffold one feature package in:
- `documentation/specs/runtime/<feature-slug>/`
- `documentation/specs/platform/<feature-slug>/`

## Required Files
- `spec.md`
- `clarify.md`
- `plan.md`
- `tasks.md`
- `analyze.md`

Optional files:
- `research.md`
- `data-model.md`
- `contracts/`
- `checklists/`
- `history/legacy-plans/`

## Metadata Block (copy to each artifact)
```md
> **Domain:** `[runtime | platform]`
> **Feature Slug:** `[feature-slug]`
> **Status:** `[Not Started | In Progress | Blocked | Complete]`
> **Created:** `YYYY-MM-DD`
> **Last Updated:** `YYYY-MM-DD`
> **Legacy Sources:** `[path1, path2]` (or `N/A` for new feature)
```

## `spec.md` template
```md
# [Feature Name] - Spec

> **Domain:** `[runtime | platform]`
> **Feature Slug:** `[feature-slug]`
> **Status:** `[Not Started | In Progress | Blocked | Complete]`
> **Created:** `YYYY-MM-DD`
> **Last Updated:** `YYYY-MM-DD`
> **Legacy Sources:** `[path1, path2]`

## Objective
What the feature must deliver and why it matters.

## Inputs / Outputs
- Inputs:
- Outputs:

## Business Rules
1.
2.

## Error Behavior
- Case:
- Expected behavior:

## Test Cases
1.
2.
```

## `clarify.md` template
```md
# [Feature Name] - Clarifications

## Open Questions
1.

## Decisions
| Decision | Rationale | Date |
|---|---|---|
| - | - | YYYY-MM-DD |

## Deferred Items
- Item and reason.
```

## `plan.md` template
```md
# [Feature Name] - Implementation Plan

## Scope
### In Scope
- Item

### Out of Scope
- Item

## Approach
| # | Step | Status | Notes |
|---|---|---|---|
| 1 | Step description | Pending | - |

## Validation
- Commands:
- Acceptance criteria:
```

## `tasks.md` template
```md
# [Feature Name] - Task Breakdown

| # | Task | Dependency | Status |
|---|---|---|---|
| 1 | Task description | None | Pending |
```

## `analyze.md` template
```md
# [Feature Name] - Analysis

## Risks
- Risk:
- Mitigation:

## Trade-offs
| Option | Pros | Cons | Decision |
|---|---|---|---|
| A | - | - | - |
```

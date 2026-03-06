# Documentation-Driven Development Methodology (C4-Aligned)

Status: MVP
Last Updated: 2026-03-03

This project uses a documentation-driven development approach: the system is designed in Markdown before implementation changes are made.

The documentation is organized in layers that map directly to the C4 model (Context, Containers, Components, Code).
For the full information architecture and audience mapping, see `../../../documentation-information-architecture.md`.

## Layered Documentation Pyramid

Think of this as zooming from a satellite view down to street level.

### Layer 1 - Overview (`<service/app>.overview.md`)
A plain-English explanation of what the system does and why it exists.

### Layer 2 - System Description (`system.description.md`)
The C4 Container level. Describe:
- tech stack
- external dependencies
- data flow
- major containers/building blocks
- architectural layers

### Layer 3 - Component Descriptions (`component.description.md`)
The C4 Component level. Zoom into a single container and list internal components and responsibilities.

### Layer 4 - Individual Specs (`*.spec.md`)
The C4 Code-level contract for a unit (guard, parser, adapter, tool, etc.). Each spec should define:
- objective
- inputs/outputs
- business rules
- error handling
- minimum test cases

### Layer 5 - C4 Diagram File (`*.drawio`)
A draw.io diagram generated from structured prompt instructions (`c4-instructions-*.md`) that reflects the same architecture at L1/L2/L3.

### Layer 6 - AI Implementation Instructions (`ai_implementation/implementation-instructions.md`)
A build plan for an AI/developer to implement from specs (or to hand off safely).

## Workflow

1. DESIGN - Write/update the overview and system description.
2. DECOMPOSE - Break the system into containers/components.
3. SPECIFY - Create/update specs for each relevant unit.
4. DIAGRAM - Generate or refresh C4 diagrams from the structured prompt.
5. BUILD - Implement from the specs.
6. TEST - Implement tests derived from the spec test cases.

## Why This Works

- Specs are self-contained contracts, so implementation does not depend on reverse-engineering behavior from code.
- The folder structure mirrors the C4 zoom levels, which keeps architecture and implementation aligned.
- The docs become the source of truth; code implements the documented behavior.

## Suggested Folder Structure

```text
project/
├─ documentation/
│  ├─ <app>.overview.md
│  ├─ c4/
│  │  ├─ c4-instructions-*.md
│  │  ├─ ComponentSpecs/
│  │  │  ├─ system.description.md
│  │  │  ├─ <Component>/
│  │  │  │  ├─ component.description.md
│  │  │  │  └─ Specs/*.spec.md
│  │  └─ *.drawio
│  └─ ai_implementation/
│     └─ implementation-instructions.md
└─ src/
```

## In Short

Design top-down as nested Markdown documents (overview -> system -> components -> specs), generate C4 diagrams from the same source material, and implement bottom-up from the specs.

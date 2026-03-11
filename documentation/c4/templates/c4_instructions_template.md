# C4 Diagram Prompt Template (OpenClaw Bakery Bot)

Status: MVP
Last Updated: 2026-02-27

> Generate a draw.io XML file with C4 architecture diagrams for the following **chatbot system**.
> Use this template for **C4 Level 1 (Context)**, **Level 2 (Container)**, and **Level 3 (Component)** diagrams.
>
> Output requirements:
> - Produce valid draw.io XML (`.drawio`)
> - Keep names and relationships consistent across all levels
> - Preserve security boundaries and confirmation flow before external actions

## System Information

| Field | Value |
|---|---|
| **System Name** | `[SYSTEM NAME]` |
| **Domain** | `Bakery Operations Chatbot / OpenClaw Runtime` |
| **Runtime Type** | `[Node.js service / local bot runtime / hybrid local+host model]` |
| **Primary Language** | `Spanish (es-MX)` |

## Purpose (What / Why)

`[2-4 sentences explaining what the bot does and why it exists. Example: captures expenses and orders from chat, validates with local runtime, and only executes integrations after explicit confirmation.]`

## Core Design Principles (Must Be Visible in Diagrams/Labels)

- LLM/OpenClaw **interprets** text -> JSON
- Local runtime **validates, normalizes, and controls**
- **No external tool execution without `confirmar`**
- `operation_id` + idempotency for safe retries
- Allowlist by `chat_id` for access control

## Actors / Personas (Level 1 only)

- **Bakery Owner / Operator**: Sends commands and confirmations through Telegram or local console.
- **Admin/Developer** *(optional)*: Runs health checks, reviews logs, config, and maintenance tasks.

> Note:
> - Include human actors in **Context diagram (L1)**.
> - Do **not** include actors inside Component diagrams unless the diagram is specifically a UX/client app.

## External Systems (Direct Integrations Only)

List only systems that connect directly to this bot runtime (according to the target system scope of the diagram).

- **Telegram Bot API**: Message transport for production chat channel.
- **OpenClaw CLI**: Local agent runtime invoked by the bot process.
- **LM Studio (OpenAI-compatible API)**: Local/host model endpoint used by OpenClaw.
- **Google Sheets (Google Workspace CLI / `gws`)**: Expense/order read and append operations.
- **Trello REST API**: Order card creation/update.
- **Web Hosting / Deploy Target (e.g., Netlify)**: Static site publish target.

## Data Stores

- **SQLite (`bot.db`)**: Conversation state, operations, idempotency, dedupe data.
- **File-based Config (`.env`, OpenClaw profiles)**: Runtime configuration and local auth/profile metadata.

## Channel Inputs / Outputs (Container + Component relevance)

### Inbound Channels
- **Console Channel**: Local/manual testing
- **Telegram Channel**: Long polling via Telegram Bot API

### Outbound Responses
- Text replies (help, questions for missing fields, summaries, confirmations, results/errors)

## Core Capabilities / Skills (Use as labels or component groups when relevant)

- `intent.route`
- `help.guide`
- `missing.ask_one`
- `confirm.flow`
- `order.create`
- `expense.add`
- `order.update`, `order.cancel`, `order.status`, `payment.record`
- `report.orders`, `schedule.day_view`, `cashflow.week`
- `customer.profile`, `customer.lookup`, `customer.frequent`
- `costing.recipe_cost`, `profit.order`

## Level 1 (Context Diagram) Guidance

Show:
- Human actor(s)
- `OpenClaw Bakery Bot` as a single system
- External systems (Telegram, OpenClaw CLI, LM Studio, Sheets/Trello/Hosting)

Key relationships to label:
- `Sends messages / confirmations [Telegram text]`
- `Invokes agent runtime [CLI/JSON]`
- `Requests model inference [HTTP/JSON]`
- `Appends expense/order data [HTTP/JSON]`
- `Creates/updates order cards [HTTP/JSON]`

Callout annotations (important):
- “LLM interprets only; runtime validates and authorizes”
- “External actions require explicit confirmation”

## Level 2 (Container Diagram) Guidance

Model the bot system as containers/subsystems such as:

1. **Channel Adapters**
- `Console Channel`
- `Telegram Channel`

2. **Conversation Runtime**
- Main orchestration pipeline (intent -> parse -> validate -> missing -> confirm -> execute)

3. **OpenClaw Adapter**
- CLI invocation + JSON extraction + failover classification

4. **State & Persistence**
- SQLite database access (state, operations, idempotency)

5. **Tool Adapters**
- Expense append
- Order append / Trello card
- Web publish

6. **Config & Healthcheck**
- Env/config parsing
- Health validation

External connections (right side preferred):
- Telegram Bot API
- OpenClaw CLI (local process)
- LM Studio API
- Google Sheets / Trello / Hosting

### Container Diagram Connector Labels (use protocol + intent)

Examples:
- `Receives updates / sends replies [HTTP/JSON]`
- `Runs parser/intent agent [CLI/JSON]`
- `Requests LLM output [HTTP/JSON]`
- `Reads/writes chat state [SQLite]`
- `Executes confirmed action [HTTP/JSON]`

## Level 3 (Component Diagram) Guidance (Focus: Conversation Runtime)

Recommended component breakdown for `Conversation Runtime` container:

- `conversationProcessor`
- `allowlistGuard`
- `intentRouter`
- `parser`
- `validationGuard`
- `missingFieldPicker`
- `confirmationGuard`
- `dedupeGuard`
- `toolExecutor` *(or equivalent orchestration block)*
- `stateStore` / `operationsStore` adapters (dependencies)

Supporting dependencies often shown alongside:
- `OpenClawRuntimeAdapter`
- `jsonExtract`
- `failoverClassifier`

### Component Flow (should be visible)

```text
Inbound Message
  -> allowlistGuard
  -> confirmation check (if pending op)
  -> intentRouter
  -> parser (OpenClaw + heuristic fallback)
  -> validationGuard
  -> missingFieldPicker OR summary generation
  -> confirmationGuard
  -> toolExecutor (only after confirm)
  -> state persistence + response
```

### Component Diagram Layout (Pragmatic, not WebAPI-specific)

Use layered groups suited to this project (instead of API/Service/Infra web layers):

- **Ingress Layer**
  - channel message DTOs / normalization
- **Conversation Orchestration Layer**
  - processor + guards + flow control
- **Interpretation Layer**
  - intent router + parser + OpenClaw adapter hooks
- **Persistence Layer**
  - state store / operations / idempotency
- **Integration Layer**
  - tool adapters (Sheets/Trello/Web)

> If diagram tool/layout becomes too dense, split Level 3 into separate diagrams:
> - `Conversation Runtime`
> - `OpenClaw Adapter`
> - `Tools / Integrations`

## Security / Reliability Annotations (Include visually where possible)

- `ALLOWLIST_CHAT_IDS` gate before runtime processing
- `confirmar/cancelar` gate before tool execution
- `operation_id` for idempotency
- `strict mode` + `softfail` (transient OpenClaw failures only)
- secret redaction in logs
- timeout/retry boundaries on external connectors

## Deployment / Network Notes (Optional callouts for this project)

Use as notes in diagrams if relevant:
- Bot runtime runs in Linux VM
- LM Studio runs on host machine (Windows) via host-only network
- Base URL example: `http://192.168.56.1:1234/v1`
- Telegram token and provider tokens are stored locally and must be redacted from logs

## Diagram Styling Guidance (Recommended)

- Keep external systems on the **right**
- Keep actors on the **left** (L1)
- Use consistent color coding:
  - Core runtime components: blue
  - Persistence: green
  - External systems: gray
  - Security/guards: amber
  - Planned/future containers: dashed border

- Every relationship label should include:
  - action verb
  - protocol/format in brackets

Examples:
- `Polls updates [HTTP/JSON]`
- `Routes intent parse [CLI/JSON]`
- `Loads state [SQLite]`
- `Appends expense row [HTTP/JSON]`

## Fill-in Template Block (Copy/Paste Before Generation)

```md
System Name: [OpenClaw Bakery Bot]
Scope Level: [C4 Level 1 / Level 2 / Level 3]
Diagram Focus: [Full system / Conversation Runtime / OpenClaw Adapter / Tool Integrations]

Purpose:
[...]

Actors:
- [...]

External Systems:
- [...]

Data Stores:
- [...]

Containers / Components (for this level):
- [...]

Key Flows:
1. [...]
2. [...]
3. [...]

Security Constraints:
- allowlist by chat_id
- confirm before external action
- operation_id idempotency
- redact secrets in logs

```

## Canonical Reuse Rule

- The section below (`# Standard Output Format and Guidelines`) is canonical and must be copied **verbatim** into any instruction file generated from this template.

# Standard Output Format and Guidelines

> **DO NOT MODIFY BELOW THIS LINE**

## Output Format

- Single `.drawio` XML file with multiple tabs/pages:
  - **Tab 1**: "Level 1 - Context" *(System Context diagram)*
  - **Tab 2**: "Level 2 - Container" *(Container diagram - shows ONE API container + data stores)*
  - **Tab 3**: "Level 3 - Component" *(Component diagram - component boundaries per API with layered architecture)*

- **Level 2**: Show ONE API container for the entire service (not separate containers per API set).
- The API container connects to data stores (SQL, Blob) and external services.

- **Level 3 Component Boundary Layout** (see `c4-example.drawio` level 3 tab for reference):
  - Wrap entire diagram in a **Container Boundary** (dashed blue `#1168BD`, strokeWidth=3)
  - Each API set gets its own **Component Boundary** containing **three layer labels**:
    - **API Layer** (top) - Controllers
    - **Service Layer** (middle) - Business logic services
    - **Infrastructure Layer** (bottom) - Repository, BlobStorageService, etc.
  - Layer labels are full-width horizontal bars with light blue background (`#E8F4FD`)
  - Components are placed within their respective layer sections
  - External data stores placed **outside and below** the container boundary
  - External services that are **called by** internal components can be placed on the **LEFT side** to reduce overcrowding at the bottom
  - External callers (APIM, other services that call IN) placed **above** the container boundary
  - Use **connector hops** (`jumpStyle=arc;jumpSize=16`) when connectors cross

- **No legends** on diagrams (removed for cleaner layout)
- Use standard C4 color conventions:
  - Blue for internal
  - Gray for external (including API gateway)

## Element Description Guidelines

- Element descriptions should describe **WHAT** the system/service **DOES** on its own (its purpose)
- Do **NOT** describe what the element does in relation to the scoped service
- Relationship/action descriptions belong **ONLY** on connector labels
- **Example**:
  - "Context Processor" -> *"Processes data using contextual rules"*
  - "Context Processor" -> *"Retrieves configs from Context Configuration Service"* (not allowed)
  - The connector FROM Context Processor should say *"Requests configurations"*

## Layout and Sizing Guidelines

| Property | Value |
|----------|-------|
| Page sizes | 1600x1000 for Level 1 and Level 2, 2200x1200 for Level 3 |
| Element sizes | minimum 130x60 for components, 160x70 for controllers |
| Spacing | minimum 60-80px between elements, 40px between layers |
| Stroke width | 2 for connectors |
| Font sizes | 18pt for titles, 10-11pt for labels |
| Container Boundary | Dashed blue (`#1168BD`), strokeWidth=3 |
| Component Boundary | Dashed blue (`#1168BD`), strokeWidth=2 |
| Layer labels | Light blue background (`#E8F4FD`), blue text (`#1168BD`), 20px height, full-width |
| Internal components | Blue (`#438DD5`), strokeColor=`#2E6295`, arcSize=10 |
| External systems | Gray (`#999999`), strokeColor=`#666666` |
| API Gateway (APIM) | Gray (`#999999`), strokeColor=`#666666` *(external)* |
| Azure services | Gray (`#999999`), strokeColor=`#666666`, labeled with `[Azure Service]` |

- Center diagrams on the page (don't push content to one side)
- Text must fit inside elements - use `<br>` for line breaks if needed
- **Level 3 layers**: Each layer section ~120px tall, stacked vertically with 20-40px gap between
- **Element labels**: Name on first line, type label `[Controller]`/`[Service]`/`[Infrastructure]` on second line
- **Level 3 external callers**: Position callers above the container boundary centered relative to their target component boundaries (e.g., APIM near center for Security Roles, Context Processor near left for Config API)
- **Level 3 container boundary**: Width ~1800px to accommodate multiple component boundaries side by side
- **Azure services**: Position on the **RIGHT side** of all diagrams as individual external elements

## Connector Guidelines

- **EVERY** connector MUST have a descriptive text label (no unlabeled connectors)
- Labels should describe the action/data flow (e.g., *"Sends CRUD requests"*, *"Reads/writes indexes"*)
- Add `labelBackgroundColor=#ffffff` to all edge labels for white background
- Use `mxGeometry` offset (`mxPoint x/y`) to position labels away from intersections
- For parallel horizontal connectors: offset labels vertically (`y=-10` or `y=10`)
- For parallel vertical connectors: offset labels horizontally (`x=-30` or `x=30`)

### Connector Crossover Hops

- Use **jump style** to create visual "hops" when connectors cross each other
- Add `jumpStyle=arc;jumpSize=16` to connector style for arc-shaped hops
- This prevents visual confusion when multiple connectors cross paths

### Connector Routing Optimization

- Route external callers through a shared horizontal zone (e.g., `y=200`) before dropping into component boundaries
- Use different entry/exit points (0.25, 0.5, 0.75) to spread connector attachment points
- Route infrastructure-to-external connectors at different Y-levels to avoid overlap
- Within component boundaries, connectors flow vertically between layers
- **External callers positioned on the left** should enter components from the LEFT side (`entryX=0`)
- **External callers positioned on the right** should enter components from the RIGHT side (`entryX=1`)
- Use waypoints to route connectors cleanly through intermediate Y-levels before descending into boundaries

## Connector Direction

- Connectors should point **FROM** the caller/consumer **TO** the service being called
- For data stores: point **FROM** the API/service **TO** the database/storage
- Arrow direction indicates "calls" or "sends data to" relationship

## Avoiding Title/Text Overlap

- System/container boundary titles should be **SEPARATE** text elements with white background (`fillColor=#ffffff`)
- Position boundary titles inside the boundary box but leave space below for connectors to route
- Route connectors around boundary titles using waypoints if needed
- Use entry/exit points (`entryX`, `entryY`, `exitX`, `exitY`) to control connector attachment
- For connectors entering boundaries from above, route them to avoid the title area

## Avoiding Element Overlap With Connectors

- **Never** route connectors through other elements (boxes, components, controllers)
- Use waypoints (`Array of mxPoint`) to route connectors **AROUND** elements
- When connecting from a lower element to an upper-right element, route right first (past all elements), then up
- Calculate element boundaries before routing:
  - Right edge = `x + width`
  - Bottom edge = `y + height`
- Add 20-30px padding when routing around elements
- Prefer entering elements from unused sides (bottom, top) to avoid crossing

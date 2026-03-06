# C4 Instructions - OpenClaw Bakery Bot (System-Level)

Status: MVP
Last Updated: 2026-02-27

Use this file as the **filled input** for the template:
- `documentation/c4/templates/c4_instructions_template.md`

Goal:
- Generate a **single `.drawio` XML** with C4 diagrams for the system (L1, L2, L3)
- Keep the diagram aligned with the target system design and roadmap

## Fill-in Template Block (System-Level)

```md
System Name: OpenClaw Bakery Bot
Scope Level: C4 Level 1 + Level 2 + Level 3
Diagram Focus: Full system (L1/L2) + one L3 page per core container

Purpose:
OpenClaw Bakery Bot is a chat-based operations assistant for a bakery business. It receives free-form messages (console/Telegram), uses OpenClaw + a local model endpoint to interpret intent and extract structured JSON, and then applies local validation, missing-field prompts, and explicit confirmation before executing any external integration. The system is designed for safe, traceable operations with allowlist access control, operation_id-based idempotency, and SQLite-backed conversation state.

Actors:
- Bakery Owner / Operator [Person]: sends commands and confirmations in Spanish via Telegram or local console.
- Admin / Developer [Person] (optional in L1): runs health checks, reviews sanitized logs/config, and maintains the runtime.

External Systems:
- Telegram Bot API [External System]: production chat transport (long polling).
- OpenClaw CLI [External System]: local agent runtime invoked by the Node.js bot process.
- LM Studio OpenAI-compatible API [External System]: model inference endpoint used by OpenClaw (host-only network).
- Google Sheets via Apps Script Web App [External System]: append expense/order rows.
- Trello REST API [External System]: create/update order cards.
- Web Hosting / Deploy Target (e.g., Netlify) [External System]: publish generated static site.

Data Stores:
- SQLite bot.db [Data Store]: conversation state, pending operations, idempotency keys, dedupe records.
- File Config (.env + OpenClaw profiles) [Data Store]: runtime configuration and provider/profile metadata.

Containers / Components (for this level):
- L1 Context:
  - OpenClaw Bakery Bot [System]

- L2 Containers inside OpenClaw Bakery Bot:
  - Channel Adapters [Container] (Console Channel, Telegram Channel)
  - Conversation Runtime [Container]
  - OpenClaw Adapter [Container]
  - State & Persistence [Container]
  - Tool Adapters [Container] (expense/order/web tools)
  - Config & Healthcheck [Container]

- L3 Components (by container):
  - Conversation Runtime:
    - conversationProcessor [Component]
    - allowlistGuard [Component]
    - intentRouter [Component]
    - parser [Component]
    - validationGuard [Component]
    - missingFieldPicker [Component]
    - confirmationGuard [Component]
    - dedupeGuard [Component]
    - toolExecutor (or equivalent orchestration block) [Component]
    - stateStore / operationsStore adapters [Component]
    - Supporting dependencies shown near runtime:
      - OpenClawRuntimeAdapter [Component]
      - jsonExtract [Component]
      - failoverClassifier [Component]
  - Channel Adapters:
    - channelFactory [Component]
    - telegramChannel [Component]
    - consoleChannel [Component]
  - Config & Healthcheck:
    - appConfig [Component]
    - healthcheck [Component]
  - OpenClaw Adapter:
    - runtime [Component]
    - jsonExtract [Component]
    - failoverClassifier [Component]
  - Tool Adapters:
    - append-expense [Component]
    - append-order [Component]
    - create-card [Component]
    - publish-site [Component]
  - State & Persistence:
    - database [Component]
    - stateStore [Component]
    - operationsStore [Component]
    - idempotency [Component]

- L3 Pages (one page per container):
  - Conversation Runtime
  - Channel Adapters
  - Config & Healthcheck
  - OpenClaw Adapter
  - Tool Adapters
  - State & Persistence

Key Flows:
1. Inbound message processing
   - Operator sends message [Telegram text / console text]
   - Channel Adapter forwards `{chat_id, text}` to Conversation Runtime
   - allowlistGuard validates `ALLOWLIST_CHAT_IDS`
   - intentRouter classifies (`gasto`, `pedido`, `web`, `ayuda`, `unknown`)
   - parser calls OpenClaw Adapter (OpenClaw CLI -> LM Studio) and/or heuristic fallback
   - validationGuard normalizes and validates Zod draft/final schema
   - missingFieldPicker asks exactly one missing field, OR runtime builds summary + pending operation

2. Confirmation and execution gate
   - User replies `confirmar` or `cancelar`
   - confirmationGuard validates command
   - dedupe/idempotency checks run using `operation_id`
   - toolExecutor executes only after confirmation
   - State & Persistence stores result and clears/updates pending state

3. OpenClaw invocation and resilience
   - OpenClaw Adapter invokes OpenClaw CLI [CLI/JSON]
   - OpenClaw CLI requests inference from LM Studio [HTTP/JSON]
   - jsonExtract parses JSON from payloads/markdown fenced output
   - failoverClassifier marks transient failures (timeout/aborted/rate-limit) for soft fallback behavior

Security Constraints:
- allowlist by chat_id before processing
- no external action without explicit confirmar/cancelar gate
- operation_id idempotency + dedupe window
- strict mode with softfail only for transient OpenClaw failures
- redact secrets/tokens in logs and diagrams
- show sensitive integrations without real credentials

```

## Diagram Generation Notes (Project-Specific)

### Level 1 (Context)
- Show the bakery owner and optionally admin/developer on the left.
- Show `OpenClaw Bakery Bot [System]` at center.
- Show direct external systems on the right.
- Include note: `LLM interprets only; runtime validates and authorizes`.

### Level 2 (Container)
- Keep containers inside a system boundary named `OpenClaw Bakery Bot`.
- Show `OpenClaw Adapter` as separate from `Conversation Runtime`.
- Show `OpenClaw CLI` and `LM Studio` outside the system boundary and connected in sequence.
- Show `State & Persistence` connected to `Conversation Runtime` with `[SQLite]`.
- Show `Tool Adapters` connected to external systems relevant to the selected scope.

### Level 3 (Component - One Page per Container)
- Produce one component page for each container:
  - `Conversation Runtime`
  - `Channel Adapters`
  - `Config & Healthcheck`
  - `OpenClaw Adapter`
  - `Tool Adapters`
  - `State & Persistence`

#### L3 - Conversation Runtime
- Use project-specific layered layout (Ingress / Orchestration / Interpretation / Persistence / Integration).
- Explicitly show:
  - `allowlistGuard` before deeper processing
  - `confirmationGuard` before `toolExecutor`
  - `parser` using `OpenClawRuntimeAdapter` and fallback logic
  - `stateStore` / `operationsStore` for pending operations and idempotency support
- Add a security annotation for `confirmar/cancelar` gate and `operation_id`.

#### L3 - Channel Adapters
- Show `channelFactory`, `telegramChannel`, `consoleChannel`, and shared channel contract.
- Highlight Telegram long polling flow (`getUpdates` offset progression) and `sendMessage`.
- Show explicit conversion/normalization of `chat.id` -> `chat_id` string.

#### L3 - Config & Healthcheck
- Show `appConfig` parsing component and `healthcheck` report component.
- Show config inputs from `.env` and outputs to runtime/channel/openclaw settings.
- Show health status aggregation (`ok|warn|fail`) and key checks.

#### L3 - OpenClaw Adapter
- Show `runtime` invocation, `jsonExtract`, and `failoverClassifier`.
- Show CLI invocation path and LM Studio dependency.
- Show strict/softfail transient classification boundary.

#### L3 - Tool Adapters
- Show `append-expense`, `append-order`, `create-card`, `publish-site`.
- Show confirmation precondition and `operation_id` propagation into all tool calls.
- Show dry-run path vs real integration path where applicable.

#### L3 - State & Persistence
- Show `database`, `stateStore`, `operationsStore`, `idempotency` components.
- Show `convo_state` and `operations` concerns, including dedupe/idempotency index behavior.
- Show operation lifecycle statuses (`pending_confirm`, `confirmed`, `canceled`, `executed`).

## Source-of-Truth References (Use for names and scope)

- Overview: `documentation/bot-bakery.overview.md`
- System description: `documentation/c4/ComponentSpecs/system.description.md`
- Conversation Runtime component docs:
  - `documentation/c4/ComponentSpecs/ConversationRuntime/component.description.md`
  - `documentation/c4/ComponentSpecs/ConversationRuntime/Specs/*.spec.md`
- OpenClaw adapter component docs:
  - `documentation/c4/ComponentSpecs/OpenClawRuntime/component.description.md`
- State/persistence docs:
  - `documentation/c4/ComponentSpecs/StateAndPersistence/component.description.md`
- Tool adapter docs:
  - `documentation/c4/ComponentSpecs/Tools/component.description.md`
  - `documentation/c4/ComponentSpecs/Tools/Specs/*.spec.md`
- Config/health docs:
  - `documentation/c4/ComponentSpecs/ConfigAndHealthcheck/component.description.md`
  - `documentation/c4/ComponentSpecs/ConfigAndHealthcheck/Specs/*.spec.md`
- Roadmap and grouped skills:
  - `documentation/bot-bakery.roadmap.md`
- Security and threat model:
  - `documentation/bot-bakery-security-and-good-practices.md`
  - `documentation/security/threat-model-stride.md`
  - `documentation/security/sensitive-payload-logging-policy.md`
- Operations docs:
  - `documentation/operations/config-matrix.md`
  - `documentation/operations/logging-trace-catalog.md`
  - `documentation/operations/runbook-common-failures.md`
- Governance docs:
  - `documentation/glossary.md`
  - `documentation/adr/README.md`

## Output Expectation

- Produce one `.drawio` XML with tabs/pages:
  - `Level 1 - Context`
  - `Level 2 - Container`
  - `Level 3 - Component (Conversation Runtime)`
  - `Level 3 - Component (Channel Adapters)`
  - `Level 3 - Component (Config & Healthcheck)`
  - `Level 3 - Component (OpenClaw Adapter)`
  - `Level 3 - Component (Tool Adapters)`
  - `Level 3 - Component (State & Persistence)`
- Include a small legend per page (core/in-scope, optional/variant, security gate, external, datastore).
- Do not include any real tokens, API keys, or sensitive IDs.

## Conflict Resolution (Project Precedence)

- The canonical `# Standard Output Format and Guidelines` block below is copied verbatim from the template.
- For this repository, when a rule in that canonical block conflicts with OpenClaw Bakery system rules defined above, this file project-specific sections take precedence.
- Specifically, keep the system-level structure required in this file: L1 + L2 + six L3 pages, OpenClaw-specific component names, and per-page legend/security notes.

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

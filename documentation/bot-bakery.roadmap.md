# OpenClaw Bakery Bot Roadmap (v1)

Status: MVP
Last Updated: 2026-03-05

## 1) Project Goal

Build a chat bot for a bakery business with three initial capabilities:

1. `gasto` (expense): record business expenses in Google Sheets.
2. `pedido` (order): capture orders via chat, create a Trello card, and register the order in Google Sheets.
3. `web`: generate and update a static website for the business using chat commands.

Key principle:
- The LLM only interprets free-form text into structured JSON.
- The runtime validates, asks for missing fields, shows a summary, and only executes integrations after `confirmar`.

## 2) Stack and Base Decisions (OpenClaw)

- Agent runtime: `OpenClaw`
- Language: `Node.js + TypeScript`
- Schema validation: `Zod`
- State and idempotency: `SQLite`
- Testing: `Vitest`
- External integrations:
  - Trello REST API
  - Google Sheets via Apps Script Web App (default MVP path) or Google Workspace CLI provider (`gws`)
  - Initial web hosting: Netlify
- Conversation language: Spanish (`es`)
- Default currency: `MXN`
- Default timezone: `America/Mexico_City`

## 3) Functional Architecture in OpenClaw

Suggested components:

- `channel_ingress`: receives messages (Telegram or another channel)
- `intent_router_skill`: classifies `gasto`, `pedido`, `web`, `ayuda`
- `parser_skill`: transforms free-form text into strict JSON
- `validation_guard`: applies Zod, normalizes values, detects missing fields
- `confirmation_guard`: blocks external actions until `confirmar`
- `tool_executor`: runs Trello / Sheets / Web deployment connectors
- `state_store`: stores conversational context + `operation_id`
- `dedupe_guard`: prevents duplicates within a time window

Unified flow:

1. A message arrives through a channel.
2. The router detects intent.
3. The LLM parser produces JSON based on the schema.
4. The validation guard validates and normalizes.
5. If data is missing: ask for exactly one missing field per turn.
6. When complete: show a structured summary.
7. User replies `confirmar` or `cancelar`.
8. If confirmed: `tool_executor` calls integrations.
9. Save `operation_id` and result for idempotency.

## 4) Capability Specifications

### 4.1 `gasto` -> Google Sheets

Example command:
- `gasto 380 harina y azucar en Costco`

Required fields:
- `monto` (number)
- `concepto` (string)

Optional fields:
- `moneda` (default `MXN`)
- `categoria` enum: `insumos | servicios | otros`
- `metodo_pago` enum: `efectivo | transferencia | tarjeta`
- `proveedor` (string)
- `fecha` (default today, timezone `America/Mexico_City`)
- `notas` (string)

Rules:
- Mandatory confirmation before writing to Sheets.
- Anti-duplicate: same chat + same amount + similar concept within 10 minutes.

Sheets columns (fixed order):
- `fecha, monto, moneda, concepto, categoria, metodo_pago, proveedor, notas, chat_id, operation_id`

### 4.2 `pedido` -> Trello + Google Sheets

Example command:
- `pedido 12 cupcakes red velvet manana 2pm recoger 480 pagado`

Required fields:
- `nombre_cliente` (string)
- `producto` (string)
- `cantidad` (number)
- `tipo_envio` enum: `envio_domicilio | recoger_en_tienda`
- `fecha_hora_entrega` (local datetime)

Conditional fields:
- `direccion` (required if `tipo_envio = envio_domicilio`)

Optional fields:
- `telefono` (string)
- `descripcion_producto` (string)
- `sabor_pan` enum: `vainilla | chocolate | red_velvet | otro`
- `sabor_relleno` enum: `cajeta | mermelada_fresa | oreo`
- `estado_pago` enum: `pagado | pendiente | parcial`
- `total` (number)
- `notas` (string)

Rules:
- Always show a summary and require `confirmar/cancelar`.
- Anti-duplicate: same chat + same delivery date/time + similar items within 10 minutes.
- Product/flavor catalog: fixed, versioned, and extensible list.

Trello:
- Title: `Pedido #<folio> - <main item>`
- Minimum labels: `estado_pago`, `tipo_envio`, `sabor_pan`, `sabor_relleno`
- Description: structured summary + metadata (`chat_id`, timestamp, `operation_id`)

Sheets (orders):
- `fecha_registro, folio, fecha_hora_entrega, nombre_cliente, telefono, producto, descripcion_producto, cantidad, sabor_pan, sabor_relleno, tipo_envio, direccion, estado_pago, total, moneda, notas, chat_id, operation_id`

### 4.3 `web` -> Static Website Generator

MVP commands (optional chat mode):
- `web crear`
- `web menu ...`
- `web publicar`

Operational default:
- Chat mode for `web` is disabled by default (`WEB_CHAT_ENABLE=0`).
- Preferred mode is content-driven publish from repository JSON via terminal/CI (`npm run web:publish`).

MVP scope:
- Landing page
- Product catalog page (cards with image, name, description, and price)
- Menu
- Contact page
- Delivery/coverage zones

Minimum content:
- `businessName`
- `whatsapp`
- `zones`
- `menuItems` (`nombre`, `descripcion`, `precio`)
- `catalogItems` (`id`, `nombre`, `descripcion`, `precio`, `categoria`, `imageUrl`)
- `brandStyle` (colors, tone, style)
- `cta`
- `gallery` (primary source: Facebook/Instagram)

Photos:
- Primary source: business Facebook page media (posts/albums).
- Fallback: manual URL selection when extraction fails or media is low quality.
- Only use public image URLs explicitly selected/approved in confirmation flow.
- Do not ingest private customer images or personal profile media.

Publishing:
- Generate deployable output.
- Support optional automatic publish.
- Confirmation required before publishing.

Site language:
- Spanish in v1.

### 4.4 Proposed Skills Catalog (Grouped)

The bot is implemented by skill groups to reduce complexity and reuse guards/state.

#### Group A - Conversational (shared base)
- `intent.route`: classify `gasto | pedido | web | ayuda | reporte | cliente | agenda`
- `help.guide`: command examples per capability/channel
- `confirm.flow`: summary + `confirmar/cancelar`
- `missing.ask_one`: ask only one missing field per turn
- `search.entity`: text search for orders/customers/expenses

#### Group B - Bakery Operations (daily work)
- `order.create`: create a new order
- `order.update`: change date, flavor, quantity, address, payment status, etc.
- `order.cancel`: cancel an order (with confirmation)
- `order.status`: query order status
- `expense.add`: record an expense
- `quote.order`: quote an order before confirming sale
- `payment.record`: register deposits/payments and balances
- `shopping.list.generate`: supplies list for one or more orders
- `inventory.consume`: decrement inventory when an order is confirmed

#### Group C - Operations and Scheduling
- `schedule.day_view`: day schedule (deliveries, baking, purchases)
- `schedule.week_view`: weekly schedule / reminders
- `cashflow.week`: weekly cashflow (income/expenses/receivables)
- `report.orders`: orders for today/week/month
- `report.reminders`: upcoming order reminders

#### Group D - Customers and Relationships
- `customer.profile`: preferences, allergies, flavor notes, restrictions
- `customer.lookup`: search customer / previous orders
- `customer.frequent`: frequent customers and recurrence

#### Group E - Costing and Profitability
- `costing.recipe_cost`: cost per recipe (ingredients + packaging)
- `profit.order`: profit per order (sale - costs - fees - shipping)

#### Group F - Web (growth)
- `web.create`
- `web.menu.update`
- `web.publish`

#### Group G - Admin / Security / Operations
- `admin.health`: healthcheck and runtime status
- `admin.allowlist`: allowlist query/management
- `admin.logs`: traces by `chat_id` / `operation_id` (no secrets)
- `admin.config.view`: sanitized config view (no tokens)

### 4.5 Target Use Cases / Functional Backlog

Questions/commands the bot should support progressively:

- `Agrega este pedido`
- `Que pedidos tengo para hoy / esta semana / este mes`
- `Cual es el estado de este pedido?`
- `Puedes buscar el pedido de ...`
- `Agrega este gasto (insumo, gas, luz, etc)`
- `Dame la cotizacion para este pedido`
- `Cambia la fecha, sabor, etc de este pedido`
- `Cancela el siguiente pedido`
- `Recuerdame los pedidos que tengo por semana`
- `Descuenta insumos cuando se crea un pedido`
- `Dame una lista de insumos para surtir X pedido`
- `Dame el costo por receta`
- `Dame la utilidad por pedido`
- `Guarda las preferencias de este cliente`
- `Cuales son los clientes frecuentes`

Current coverage (status):
- Conversational base covered: intent detection, parsing, missing-field prompts, confirmation/cancellation.
- Security baseline covered: allowlist, dedupe/idempotency, per-chat rate limiting with burst block.
- `order.create`: end-to-end completed (Trello + Sheets) with live smoke validated.
- `expense.add`: end-to-end completed (HTTP Apps Script live validated) with API key hardening and smoke validation.
- `web.publish`: adapter + runtime flow integrated, with chat path behind feature flag and content-driven terminal/CI publish path enabled.
- Static site scaffold generated from repository content (`site/CONTENT.json` -> `site/dist`) via `npm run web:build`.
- Branding-ready scaffold (`logo` + `tarjeta`) and Facebook gallery import helper available (`npm run web:import:facebook`).
- UI smoke coverage for conversion-critical flows available via Playwright-core (`npm run smoke:web:ui`), including desktop/mobile checks and WhatsApp CTA validation.
- Pending: reports, scheduling, customers, costing/profitability, and inventory.

Execution tracking source of truth:
- `documentation/ai_implementation/ddd-roadmap-coverage-matrix.md`

## 5) Security and Reliability in OpenClaw

- Allowlist of authorized `chat_id` values.
- Mandatory confirmation before any external action.
- LLM parser has no direct access to external tools.
- Permission scoping per skill/tool (least privilege).
- Do not log secrets (tokens/keys).
- Basic rate limiting per chat.
- Idempotency via `operation_id`.
- Timeouts and retries controlled by each connector.

## 6) Implementation Roadmap (Adapted)

### Phase 0 - OpenClaw Bootstrap
- Initialize Node+TS project with OpenClaw runtime.
- Define skills and tools structure.
- Base configuration (`env`, logger, healthcheck).
- Channel connector (Telegram) for inbound/outbound messages.

### Phase 1 - Core Conversation Engine
- `intent_router_skill` for `gasto`, `pedido`, `web`, `ayuda`.
- `parser_skill` with strict JSON output.
- Zod validation + normalization.
- Conversation state (one missing field at a time).
- Universal `confirmar/cancelar` step.
- Debug/observability traces (`intent_source`, `parse_source`, `allowlist_reject`).

### Phase 2 - `gasto` End-to-End
- Expense -> Sheets row mapper.
- `append-expense` tool.
- Provider toggle for Sheets (`apps_script | gws`) preserving dry-run safe defaults.
- Dedupe guard + idempotency.
- Unit tests for parsing/validation and integration tests.
- Live smoke validated against Apps Script endpoint with API key authentication.
- Optional domain extensions:
  - `costing.recipe_cost`
  - `cashflow.week`

### Phase 3 - `pedido` End-to-End
- Order -> Trello card mapper.
- `create-card` tool.
- `append-order` tool for Sheets.
- Provider toggle for Sheets (`apps_script | gws`) preserving dry-run safe defaults.
- Unit and integration tests in sandbox environment.
- Live smoke validated in controlled environment (Trello + Apps Script Sheets).
- Domain skills:
  - `order.update`, `order.cancel`, `order.status`, `payment.record`, `quote.order`
- Operations skills:
  - `schedule.day_view`, `schedule.week_view`, `report.orders`, `report.reminders`
- Customer skills:
  - `customer.profile`, `customer.lookup`, `customer.frequent`
- Inventory skills:
  - `shopping.list.generate`, `inventory.consume`

### Phase 4 - `web` MVP
- Base static template + `CONTENT.json`.
- Skills/commands `web.create`, `web.menu.update`, `web.publish`.
- Output generation and optional Netlify deploy.
- Visual catalog generated from `catalogItems` in `CONTENT.json`.
- Facebook media import path with explicit confirmation and manual fallback.
- Content-driven build implemented: `npm run web:build` generates `site/dist` from repository content.

### Phase 5 - Analytics and Profitability
- `costing.recipe_cost` with recipe/ingredient catalog.
- `profit.order` (sale - cost - fees - shipping).
- Consolidated `cashflow.week` with orders/expenses/receivables.
- Business reports (weekly/monthly).

### Phase 6 - Hardening and Operations
- Better normalization for dates/amounts.
- Observability per skill/tool (`chat_id`, `operation_id`).
- Integration error handling and runbooks.
- Security tuning and limits.
- Admin skills (`admin.health`, `admin.logs`, `admin.allowlist`, `admin.config.view`).

## 7) Definition of Done (MVP)

- Bot responds in the enabled channel for allowlisted users.
- Confirmed `gasto` creates a Sheets row without duplicates.
- Confirmed `pedido` creates a Trello card and Sheets row without duplicates.
- Missing-field prompts work one field per turn.
- Confirmation/cancellation is mandatory and reliable.
- Logs provide traceability (`chat_id`, `operation_id`) without secrets.
- Telegram works with allowlist and confirmation/cancellation flow.

## 8) Quick Mapping from Original Roadmap to OpenClaw Version

1. `grammY + Fastify` -> `channel_ingress + OpenClaw runtime + tools`
2. Router and parser -> dedicated skills (`intent_router_skill`, `parser_skill`)
3. Confirmation/cancellation -> shared `confirmation_guard`
4. Trello/Sheets/Web integrations -> tools with scoped permissions
5. SQLite/idempotency/testing -> kept as-is

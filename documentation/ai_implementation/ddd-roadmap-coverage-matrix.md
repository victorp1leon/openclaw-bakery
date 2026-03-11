# DDD Roadmap Coverage Matrix

Status: In Progress
Last Updated: 2026-03-11

## Purpose
Matriz operativa para responder, por cada capacidad del roadmap, el estado de:
1. Diseno documentado (spec-first)
2. Cobertura de tests
3. Implementacion real

## Status Legend
- `Done`: diseno + tests + implementacion real completados.
- `Partial`: hay diseno y/o tests, pero implementacion real incompleta o en stub.
- `Planned`: aparece en roadmap, pero falta diseno detallado (`*.spec.md`).

## Phase Summary (Roadmap vs Reality)
| Fase | Objetivo | Diseno | Tests | Implementacion | Estado actual |
|---|---|---|---|---|---|
| 0 | Bootstrap OpenClaw runtime | Yes | Yes | Yes | Done |
| 1 | Core conversation engine | Yes | Yes | Yes | Done |
| 2 | `gasto` E2E | Yes (tool spec connector-ready) | Yes | Real Apps Script HTTP path (default) + optional `gws` path + dry-run safe default + API key hardening + live smoke validated | Done |
| 3 | `pedido` E2E | Yes (tool specs connector-ready) | Yes (adapter + runtime tests) | Real connector paths + live smoke validated (Trello + Sheets Apps Script) + optional `gws` Sheets path | Done |
| 4 | `web` MVP | Yes (tool spec connector-ready) | Yes (`web.publish` adapter + runtime tests + smoke/content-driven scripts) | Runtime `intent web` integrado (feature-flagged, default off) + adapter real + `web:build` static scaffold + `web:publish` content-driven | Partial |
| 5 | Analytics/profitability | No (roadmap only) | No | No | Planned |
| 6 | Hardening/operations/admin skills | Partial | Partial | Partial | Partial |

## Capability Matrix
| Fase | Capability | Diseno (spec) | Tests | Implementacion | Estado | Siguiente accion DDD |
|---|---|---|---|---|---|---|
| 0 | Channel factory / adapters | `c4/ComponentSpecs/Channels/Specs/*` | `src/channel/telegramChannel.test.ts` | `src/channel/*` | Done | Mantener con cambios de canal |
| 0 | Config + healthcheck | `c4/ComponentSpecs/ConfigAndHealthcheck/Specs/*` | `src/config/appConfig.test.ts`, `src/health/healthcheck.test.ts` | `src/config/*`, `src/health/*` | Done | Mantener matriz config/health |
| 1 | `intent.route` | `.../ConversationRuntime/Specs/intent-router.spec.md` | `src/skills/intentRouter.test.ts` | `src/skills/intentRouter.ts` | Done | Sin accion inmediata |
| 1 | `parser_skill` | `.../ConversationRuntime/Specs/parser.spec.md` | `src/skills/parser.test.ts` | `src/skills/parser.ts` | Done | Sin accion inmediata |
| 1 | `validation_guard` | `.../ConversationRuntime/Specs/validation-guard.spec.md` | `src/guards/validationGuard.test.ts` | `src/guards/validationGuard.ts` | Done | Sin accion inmediata |
| 1 | `missing.ask_one` | `.../ConversationRuntime/Specs/missing-field-picker.spec.md` | `src/guards/missingFieldPicker.test.ts` | `src/guards/missingFieldPicker.ts` | Done | Sin accion inmediata |
| 1 | `confirm.flow` | `.../ConversationRuntime/Specs/confirmation-guard.spec.md` | `src/guards/confirmationGuard.test.ts` | `src/guards/confirmationGuard.ts` | Done | Sin accion inmediata |
| 1 | `dedupe_guard` | `.../ConversationRuntime/Specs/dedupe-guard.spec.md` | `src/guards/dedupeGuard.test.ts` | `src/guards/dedupeGuard.ts` | Done | Sin accion inmediata |
| 1/6 | `allowlist_guard` | `.../ConversationRuntime/Specs/allowlist-guard.spec.md` | `src/guards/allowlistGuard.test.ts` | `src/guards/allowlistGuard.ts` | Done | Sin accion inmediata |
| 1/6 | `rate_limit_guard` | `.../ConversationRuntime/Specs/rate-limit-guard.spec.md` | `src/guards/rateLimitGuard.test.ts` | `src/guards/rateLimitGuard.ts` | Done | Afinar thresholds por entorno |
| 1 | Runtime orchestration | `.../ConversationRuntime/Specs/conversation-processor.spec.md` | `src/runtime/conversationProcessor.test.ts`, `src/runtime/channelRuntimeState.integration.test.ts` | `src/runtime/conversationProcessor.ts` | Done | Sin accion inmediata |
| 2 | `expense.add` (connector) | `.../Tools/Specs/append-expense.spec.md` (connector-ready) | `src/tools/expense/appendExpense.test.ts` + runtime confirm tests + smoke script | `src/tools/expense/appendExpense.ts` (provider `apps_script`/`gws`, default Apps Script, dry-run + retries bounded) | Done | Validar smoke de provider `gws` en entorno controlado |
| 3 | `order.create` Trello card | `.../Tools/Specs/create-card.spec.md` (connector-ready) | `src/tools/order/createCard.test.ts` + runtime confirm tests | `src/tools/order/createCard.ts` (real Trello path + dedupe + dry-run) | Done | Monitorear errores de auth/rate limit en operacion |
| 3 | `order.create` Sheets row | `.../Tools/Specs/append-order.spec.md` (connector-ready) | `src/tools/order/appendOrder.test.ts` + runtime confirm tests | `src/tools/order/appendOrder.ts` (provider `apps_script`/`gws`, default Apps Script, dry-run + retries bounded) | Done | Validar smoke de provider `gws` en entorno controlado |
| 4 | `web.publish` | `.../Tools/Specs/publish-site.spec.md` (connector-ready, catalog + Facebook source policy) | `src/tools/web/publishSite.test.ts` + `src/runtime/conversationProcessor.test.ts` + `scripts/smoke/web-smoke.ts` + `scripts/web/publish-site-from-content.ts` | `src/tools/web/publishSite.ts` + runtime `intent web` (flag `WEB_CHAT_ENABLE`) + flujo CLI/CI `web:publish` + webhook local con target Netlify publico opcional | Done | Mantener runbook operativo y monitoreo de deploys en Netlify |
| 4 | `web.site.build` | Roadmap + content-driven plan | `npm run web:build` validation | `scripts/web/build-site-from-content.ts` + `scripts/web/import-facebook-images.ts` -> `site/dist/*` | Done | Cargar logo/tarjeta reales y curar galeria importada de Facebook |
| 3 | `order.update` | `.../Tools/Specs/update-order.spec.md` | `src/tools/order/updateOrder.test.ts` + `src/runtime/conversationProcessor.test.ts` + `scripts/smoke/update-smoke.ts` | Mutacion de `Pedidos` via `gws` con confirm flow, referencia (`folio|operation_id_ref`), patch controlado, auditoria en `notas` e idempotencia por `operation_id` | Done | Monitorear uso real y agregar smoke live controlado cuando negocio lo apruebe |
| 3 | `order.cancel` | `.../Tools/Specs/cancel-order.spec.md` | `src/tools/order/cancelOrder.test.ts` + `src/runtime/conversationProcessor.test.ts` + `scripts/smoke/cancel-smoke.ts` | Mutacion de cancelacion en `Pedidos` via `gws` con marker `[CANCELADO]`, idempotencia por marker existente y confirm flow en runtime | Done | Monitorear tasa de no-op (`already_canceled=true`) y validar smoke live controlado |
| 3 | `order.status` | `.../Tools/Specs/order-status.spec.md` | `src/tools/order/orderStatus.test.ts` + `src/runtime/conversationProcessor.test.ts` + `scripts/smoke/status-smoke.ts` | Lectura read-only de `Pedidos` via `gws` + estado operativo derivado (`programado|hoy|atrasado|cancelado`) | Done | Monitorear precision de `estado_operativo` en datos legacy sin fecha ISO |
| 3 | `order.lookup` | `.../Tools/Specs/lookup-order.spec.md` | `src/tools/order/lookupOrder.test.ts` + `src/runtime/conversationProcessor.test.ts` | Lectura read-only de `Pedidos` via `gws` + lookup por folio/nombre/producto | Done | Extender a estado enriquecido de pedido si se prioriza |
| 3 | `payment.record` | `.../Tools/Specs/record-payment.spec.md` | No | No | Partial | Implementar tool + wiring runtime + tests |
| 3 | `quote.order` | Roadmap only | No | No | Planned | Crear spec nueva + casos de prueba |
| 3 | `shopping.list.generate` | Roadmap only | No | No | Planned | Crear spec nueva + casos de prueba |
| 3 | `inventory.consume` | Roadmap only | No | No | Planned | Crear spec nueva + casos de prueba |
| 3 | `schedule.day_view` / `schedule.week_view` | Roadmap only | No | No | Planned | Crear specs de reporting/scheduling |
| 3/5 | `report.orders` | `.../Tools/Specs/report-orders.spec.md` | `src/tools/order/reportOrders.test.ts` + `src/runtime/conversationProcessor.test.ts` | Lectura real de `Pedidos` via `gws` + filtros dia/semana/mes/año (incluye fechas y meses explicitos) + respuesta en runtime | Done | Evaluar `año pasado` / `año siguiente` si se prioriza |
| 3/5 | `report.reminders` | Roadmap only | No | No | Planned | Crear spec + ventana de proximidad y reglas de recordatorio |
| 5 | `costing.recipe_cost` | Roadmap only | No | No | Planned | Crear spec de catalogo/recetas |
| 5 | `profit.order` | Roadmap only | No | No | Planned | Crear spec de calculo de utilidad |
| 5 | `cashflow.week` | Roadmap only | No | No | Planned | Crear spec de agregacion financiera |
| 6 | `admin.health` | Covered by healthcheck specs | `src/health/healthcheck.test.ts` | `src/health/healthcheck.ts` | Partial | Definir skill/command admin explicito |
| 6 | `admin.logs` / `admin.allowlist` / `admin.config.view` | Roadmap only | No | No | Planned | Crear specs de skills admin y seguridad |

## Immediate Design Backlog (Spec-First)
1. Mantener `npm run web:rollback:drill` como control manual bajo demanda y conservar bitacora de tiempos por ejecucion.
2. Fase 3 funcional:
   - Implementar `payment.record` (spec ya creada).
   - Definir spec de `quote.order`.
3. Fases 5 y 6: analytics (`costing/profit/cashflow`) y admin skills.

## Exit Criteria: "Sistema completamente disenado"
Se considera completo cuando todas las capacidades del roadmap tienen:
1. `*.spec.md` dedicado con reglas y casos de prueba.
2. Tests definidos e implementados (unitarios/integracion segun riesgo).
3. Estado de implementacion trazable (`real`, no `stub`) o marcado explicitamente como diferido.

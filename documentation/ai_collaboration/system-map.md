# OpenClaw Bakery - System Map (AI Collaboration)

Status: Active
Last Updated: 2026-03-25

## Architecture Snapshot
```text
[Console/Telegram]
        |
        v
[Channel Adapters] --> [Allowlist Guard + Rate Limit Guard]
        |
        v
[Conversation Runtime]
  intent -> parser -> validation -> missing field -> confirmation -> dedupe
        |
        v
[Tool Adapters]
  expense -> Sheets
  order -> Trello + Sheets
  web -> static publish target
        |
        v
[SQLite State]
  conversation state + operations + idempotency
```

## Runtime Registry
| Componente | Tipo | Ruta principal | Dependencias | Estado |
|---|---|---|---|---|
| Channel adapters | Entrada/salida | `src/channel/*` | Telegram Bot API | MVP |
| Conversation runtime | Orquestacion | `src/runtime/*` | guards + skills + tools | MVP |
| Guards | Control de reglas | `src/guards/*` | Zod + estado | MVP |
| Skills | Interpretacion | `src/skills/*` | OpenClaw/local parser | MVP |
| OpenClaw adapter | Integracion LLM | `src/openclaw/*` | OpenClaw CLI + LM Studio | MVP |
| Tools | Integraciones externas | `src/tools/*` | Sheets/Trello/hosting | Parcial |
| State & persistence | Persistencia | `src/state/*` | SQLite | MVP |
| Config + health | Operacion | `src/config/*`, `src/health/*` | env + readiness | MVP |

## External Integrations
| Integracion | Uso | Estado |
|---|---|---|
| Telegram Bot API | Canal conversacional | Implementado |
| OpenClaw CLI | Parseo estructurado | Implementado |
| LM Studio endpoint | Proveedor modelo local | Implementado |
| Google Sheets (GWS CLI provider) | Registro de gastos/pedidos | Implementado |
| Trello REST API | Tarjetas de pedidos | En progreso |
| Hosting estatico | Publicacion `web` | Implementado (webhook local) + Netlify-ready |

## Main Event Paths
1. `gasto`: mensaje -> parse/validacion -> confirmacion -> `appendExpense` -> persistencia/idempotencia.
2. `pedido`: mensaje -> parse/validacion -> confirmacion -> Trello + Sheets -> persistencia/idempotencia.
3. `web`: mensaje -> parse/validacion -> confirmacion -> generacion/publicacion -> registro operativo.
4. `report.orders`: consulta (`dia/semana/mes/año`, incluyendo fechas/meses explicitos) -> lectura Sheets (`gws`) con orden por recencia + limite configurable (`ORDER_REPORT_LIMIT`) -> respuesta read-only con `trace_ref` e `inconsistencias` visibles (sin confirmacion ni mutacion).
5. `order.lookup`: consulta por `folio|operation_id|nombre|producto` -> lectura Sheets (`gws`) con prioridad exact-id + limite configurable (default 10) -> respuesta resumida read-only con `trace_ref` (sin confirmacion ni mutacion).
6. `order.status`: consulta de estado operativo/pago -> lectura Sheets (`gws`) con ranking exact-id+recencia y limite configurable -> respuesta resumida con `Ref/trace_ref` (sin confirmacion ni mutacion).
7. `order.update`: mutacion por referencia -> confirmacion -> sync Trello + Sheets (`gws`) con rollback en fallos parciales -> persistencia/idempotencia.
8. `order.cancel`: mutacion de cancelacion (marker `[CANCELADO]` + `estado_pedido=cancelado`) -> confirmacion -> resolver referencia (`folio|operation_id`, o lookup por cliente con match unico) -> mover tarjeta Trello a cancelados + escritura Sheets (`gws`) con rollback en fallos parciales -> no-op idempotente visible si ya estaba cancelado y `Ref` en fallos -> persistencia/idempotencia.
9. `payment.record`: mutacion de pago por referencia -> confirmacion -> actualizacion de `estado_pago` + evento `[PAGO]` en `notas` via Sheets (`gws`) -> persistencia/idempotencia.
10. `quote.order`: consulta de cotizacion -> lectura de `CatalogoPrecios` + `CatalogoOpciones` + `CatalogoReferencias` via `gws` -> respuesta resumida (sin confirmacion ni mutacion).
11. `shopping.list.generate`: consulta de insumos/surtido -> lectura de `Pedidos` via `gws` + agregacion de productos/insumos sugeridos con recetas `inline` (smoke/mock) o `CatalogoRecetas` via `gws` (live) -> respuesta resumida (sin confirmacion ni mutacion).
12. `inventory.consume`: mutacion por referencia de pedido (comando explicito, flag `INVENTORY_CONSUME_ENABLE`) -> confirmacion -> decremento de `Inventario` + append auditable en `MovimientosInventario` via `gws` con idempotencia por `operation_id`.
13. `schedule.day_view`: consulta de agenda diaria (`agenda de hoy/manana/fecha`) -> lectura de `Pedidos` via `gws` (agendado por `fecha_hora_entrega_iso`) -> respuesta read-only en bloques `deliveries`, `preparation`, `suggestedPurchases` + `inconsistencies`, con `trace_ref` para soporte (sin confirmacion ni mutacion).
14. `admin.health`: consulta admin de salud operativa (`estado del bot`, `admin health`) -> routing read-only (`OpenClaw` o fallback deterministico) -> `runHealthcheck` via tool `adminHealth` -> respuesta sanitizada con estado/checks y `Ref/trace_ref` (sin confirmacion ni mutacion).
15. `admin.logs`: consulta admin de trazas (`admin logs`, `logs chat_id ...`, `logs operation_id ...`) -> routing read-only (`OpenClaw` o fallback deterministico) -> lectura de SQLite `operations` via tool `adminLogs` con filtros acotados y `payload_preview` redaccionado -> respuesta con `Ref/trace_ref` (sin confirmacion ni mutacion).
16. `admin.config.view`: consulta admin de configuracion (`configuracion del bot`, `admin config`) -> routing read-only (`OpenClaw` o fallback deterministico) -> snapshot sanitizado via tool `adminConfigView` (flags/booleans/counts, sin secretos) -> respuesta con `Ref/trace_ref` (sin confirmacion ni mutacion).
17. `schedule.week_view`: consulta de agenda semanal (`agenda de esta semana`, `agenda semanal de 2026-03-23`) -> resolucion de semana lunes-domingo en timezone runtime -> agregacion read-only de 7 ejecuciones `schedule.day_view` -> respuesta consolidada (`days/reminders`, `preparation`, `suggestedPurchases`) con `inconsistencies` por `dateKey` y `Ref/trace_ref` (sin confirmacion ni mutacion).
18. `report.reminders`: consulta de recordatorios de pedidos (`recordatorios de hoy/esta semana/este mes`) -> lectura read-only de `report.orders` + clasificacion de urgencia (`overdue|due_soon|upcoming`) con `minutes_to_delivery` -> respuesta priorizada con `inconsistencies` visibles y `Ref/trace_ref` (sin confirmacion ni mutacion).

## Source Documents
- `documentation/bot-bakery.overview.md`
- `documentation/specs/_index.md` (registro canonico de features y estado)
- `documentation/specs/contracts/components/README.md` (estado de contratos canonicos)
- `documentation/c4/ComponentSpecs/system.description.md` (referencia de arquitectura C4)
- `documentation/bot-bakery.roadmap.md`
- `documentation/adr/README.md`

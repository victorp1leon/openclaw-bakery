# OpenClaw Bakery - System Map (AI Collaboration)

Status: Active
Last Updated: 2026-03-13

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
4. `report.orders`: consulta (`dia/semana/mes/año`, incluyendo fechas/meses explicitos) -> lectura Sheets (`gws`) -> respuesta resumida (sin confirmacion ni mutacion).
5. `order.lookup`: consulta por folio/nombre/producto -> lectura Sheets (`gws`) -> respuesta resumida (sin confirmacion ni mutacion).
6. `order.status`: consulta de estado operativo/pago -> lectura Sheets (`gws`) -> respuesta resumida (sin confirmacion ni mutacion).
7. `order.update`: mutacion por referencia -> confirmacion -> sync Trello + Sheets (`gws`) con rollback en fallos parciales -> persistencia/idempotencia.
8. `order.cancel`: mutacion de cancelacion (marker `[CANCELADO]` + `estado_pedido=cancelado`) -> confirmacion -> mover tarjeta Trello a cancelados + escritura Sheets (`gws`) con rollback en fallos parciales -> persistencia/idempotencia.
9. `payment.record`: mutacion de pago por referencia -> confirmacion -> actualizacion de `estado_pago` + evento `[PAGO]` en `notas` via Sheets (`gws`) -> persistencia/idempotencia.
10. `quote.order`: consulta de cotizacion -> lectura de `CatalogoPrecios` + `CatalogoOpciones` + `CatalogoReferencias` via `gws` -> respuesta resumida (sin confirmacion ni mutacion).
11. `shopping.list.generate`: consulta de insumos/surtido -> lectura de `Pedidos` via `gws` + agregacion de productos/insumos sugeridos -> respuesta resumida (sin confirmacion ni mutacion).

## Source Documents
- `documentation/bot-bakery.overview.md`
- `documentation/c4/ComponentSpecs/system.description.md`
- `documentation/bot-bakery.roadmap.md`
- `documentation/adr/README.md`

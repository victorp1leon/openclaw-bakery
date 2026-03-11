# Phase 3 - Report Orders via GWS (V1)

> **Type:** `Implementation`
> **Status:** `Complete`
> **Created:** `2026-03-07`
> **Last Updated:** `2026-03-07`

## Cross-References
| Documento | Ruta | Uso |
|---|---|---|
| Roadmap | `documentation/bot-bakery.roadmap.md` | Backlog de `report.orders` |
| Runtime spec | `documentation/c4/ComponentSpecs/ConversationRuntime/Specs/conversation-processor.spec.md` | Reglas de enrutado conversacional |
| Tools spec | `documentation/c4/ComponentSpecs/Tools/Specs/report-orders.spec.md` | Contrato de consulta de pedidos |
| Runtime source | `src/runtime/conversationProcessor.ts` | Integracion del comando de reporte |
| Tool source | `src/tools/order/reportOrders.ts` | Lectura de Google Sheets via `gws` |

## Contexto
Se necesita habilitar consultas operativas de pedidos por periodo (`hoy`, `mañana`, `esta semana`) usando como fuente de verdad la pestaña `Pedidos` en Google Sheets. La implementacion debe evitar nuevas dependencias externas de backend y reutilizar la adopcion existente de `googleworkspace/cli`.

## Alcance
### In Scope
- Implementar `report.orders` v1 con periodos `today`, `tomorrow`, `week`.
- Consultar filas de pedidos desde Sheets por provider `gws`.
- Integrar deteccion de consultas en runtime sin romper flujos actuales de `pedido` (alta).
- Agregar tests de tool y runtime.

### Out of Scope
- `order.status`, `order.update`, `order.cancel`.
- Reportes financieros (`cashflow`, utilidad).
- Nuevos proveedores de lectura fuera de `gws`.

## Approach
| # | Paso | Estado | Notas |
|---|---|---|---|
| 1 | Definir specs de `report.orders` | Completed | Tool spec + ajuste runtime spec |
| 2 | Implementar adapter `gws` de lectura | Completed | `values.get` + filtros por fecha |
| 3 | Integrar deteccion de comando en runtime | Completed | Atajo determinista antes de intent router |
| 4 | Agregar pruebas focales | Completed | Tool + conversation processor + health/config/canal |
| 5 | Cerrar artefactos de colaboracion | Completed | Index + matrix + handoff |

## Decisions & Trade-offs
| Decision | Rationale | Date |
|---|---|---|
| Usar Google Workspace CLI para lectura | Mantiene la fuente de verdad en Sheets sin crear endpoint adicional | 2026-03-07 |
| Resolver consulta de reporte en runtime por deteccion local | Evita ambiguedad con intent `pedido` de alta y mantiene flujo actual estable | 2026-03-07 |

## Validation
- `npm test -- src/tools/order/reportOrders.test.ts src/runtime/conversationProcessor.test.ts`
- `npm test -- src/tools/order/reportOrders.test.ts src/runtime/conversationProcessor.test.ts src/health/healthcheck.test.ts`
- `npm test -- src/config/appConfig.test.ts src/channel/telegramChannel.test.ts src/runtime/channelRuntimeState.integration.test.ts`
- `npm run -s healthcheck`

## Outcome
Se habilito `report.orders` v1 directo sobre Google Sheets usando `googleworkspace/cli`:
- Consultas soportadas: `hoy`, `mañana`, `esta semana`.
- Fuente de verdad: pestaña `Pedidos` en Sheets (lectura `gws`).
- Integracion en runtime via deteccion local de consulta, sin romper alta de `pedido`.
- Cobertura de pruebas agregada para adapter y runtime.

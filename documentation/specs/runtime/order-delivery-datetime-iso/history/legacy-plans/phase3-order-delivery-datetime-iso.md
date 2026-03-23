# Phase 3 - Order Delivery Datetime ISO Field

> **Type:** `Implementation`
> **Status:** `Complete`
> **Created:** `2026-03-07`
> **Last Updated:** `2026-03-07`

## Cross-References
| Documento | Ruta | Uso |
|---|---|---|
| Roadmap | `documentation/bot-bakery.roadmap.md` | Schema operativo de pedidos |
| Tool spec (write) | `documentation/c4/ComponentSpecs/Tools/Specs/append-order.spec.md` | Contrato de append en Sheets |
| Tool spec (read) | `documentation/c4/ComponentSpecs/Tools/Specs/report-orders.spec.md` | Filtro por fecha de entrega |
| Adapter source | `src/tools/order/appendOrder.ts` | Escritura de pedido |
| Report source | `src/tools/order/reportOrders.ts` | Lectura y filtrado |

## Contexto
`fecha_hora_entrega` permite texto libre util para chat (`hoy a las 6pm`), pero dificulta reportes y filtros robustos. Se necesita conservar ese texto y agregar un segundo campo normalizado para uso operativo.

## Alcance
### In Scope
- Agregar normalizacion a `fecha_hora_entrega_iso` al confirmar pedido.
- Persistir `fecha_hora_entrega_iso` en append via `gws`.
- Hacer que `report.orders` use el campo ISO cuando exista.
- Cubrir comportamiento con pruebas unitarias.

### Out of Scope
- Cambios de UX conversacional de captura.
- Migracion retroactiva de filas historicas en Sheets.
- Nuevos periodos de reporte (`mes`, rango custom).

## Approach
| # | Paso | Estado | Notas |
|---|---|---|---|
| 1 | Implementar util de normalizacion de fecha/hora de entrega | Completed | `src/tools/order/deliveryDateTime.ts` |
| 2 | Integrar campo ISO en `append-order` | Completed | Webhook row + columna extra en `gws` |
| 3 | Ajustar `report-orders` para preferir ISO | Completed | Fallback a campo texto existente |
| 4 | Agregar/actualizar pruebas | Completed | util + append + report + runtime regression |
| 5 | Actualizar docs de spec/roadmap | Completed | c4 specs + roadmap + config matrix |

## Decisions & Trade-offs
| Decision | Rationale | Date |
|---|---|---|
| Guardar `fecha_hora_entrega_iso` como columna adicional | Evita romper formato actual y mantiene trazabilidad del texto original | 2026-03-07 |
| Mantener fallback de reportes a `fecha_hora_entrega` | Compatibilidad con filas historicas sin migracion inmediata | 2026-03-07 |

## Validation
- `npm test -- src/tools/order/deliveryDateTime.test.ts src/tools/order/appendOrder.test.ts src/tools/order/reportOrders.test.ts src/runtime/conversationProcessor.test.ts`

## Outcome
Los pedidos ahora conservan el texto libre de entrega y ademas registran `fecha_hora_entrega_iso` cuando puede inferirse. Los reportes v1 (`hoy/manana/esta semana`) usan ese campo para mejorar precision sin romper datos previos.

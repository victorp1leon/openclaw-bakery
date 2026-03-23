# Phase 3 - inventory.consume spec-first foundation

> **Type:** `Implementation`
> **Status:** `Complete`
> **Created:** `2026-03-13`
> **Last Updated:** `2026-03-17`

## Cross-References
| Documento | Ruta | Uso |
|---|---|---|
| Roadmap | `documentation/bot-bakery.roadmap.md` | Backlog funcional fase 3 (`inventory.consume`) |
| DDD matrix | `documentation/ai_implementation/ddd-roadmap-coverage-matrix.md` | Estado de cobertura y siguiente accion |
| Runtime spec | `documentation/c4/ComponentSpecs/ConversationRuntime/Specs/conversation-processor.spec.md` | Contrato de confirm flow para mutaciones |
| Tool spec | `documentation/c4/ComponentSpecs/Tools/Specs/inventory-consume.spec.md` | Contrato funcional y tecnico de `inventory.consume` |
| System map | `documentation/ai_collaboration/system-map.md` | Trazabilidad del nuevo flujo de evento |

## Contexto
Tras cerrar `shopping.list.generate` y la base de tabs de inventario en Sheets, el siguiente bloque funcional es `inventory.consume`. Esta iteracion inicia con enfoque spec-first para fijar contrato, riesgos y comportamiento esperado antes de tocar runtime/tools. El 2026-03-17 se incorporaron decisiones de diseno cerradas en sesion `grill-me` para reducir ambiguedad antes de implementar.

## Alcance
### In Scope
- Definir spec C4 de `inventory.consume`.
- Alinear contrato de routing/confirmacion en runtime spec.
- Actualizar roadmap, matriz DDD y system map para reflejar estado real.
- Dejar plan activo para siguiente fase de implementacion.

### Out of Scope
- Implementacion de tool/runtime de `inventory.consume`.
- Nuevos tests unitarios/integracion/smoke.
- Ejecucion live sobre Google Sheets.

## Approach
| # | Paso | Estado | Notas |
|---|---|---|---|
| 1 | Definir contrato spec-first (`tool` + `runtime`) | Completed | Incluye reglas, errores deterministicos, idempotencia y confirm flow |
| 2 | Alinear docs transversales (`roadmap`, `DDD`, `system-map`) | Completed | `inventory.consume` pasa de `Planned` a `Partial` por diseno documentado |
| 3 | Incorporar decisiones de diseno cerradas (grill) en specs/plan | Completed | Ambiguedad de referencia, cancelacion por `estado_pedido`, conversion `g<->kg`, no-op replay y gating MVP |
| 4 | Implementar tool/runtime | Completed | `inventoryConsume` tool + wiring runtime/config/index con feature flag |
| 5 | Agregar tests y smoke | Completed | Nuevos unit tests + runtime tests + `smoke:inventory` + registro en summary |
| 6 | Cerrar plan/handoff en estado `Complete` | Completed | Plan/index/handoff actualizados con evidencia |

## Decisions & Trade-offs
| Decision | Rationale | Date |
|---|---|---|
| Tratar `inventory.consume` como mutacion confirmable | Riesgo alto por impacto en stock; requiere confirmacion explicita | 2026-03-13 |
| Usar idempotencia por `operation_id` + verificacion en `MovimientosInventario` | Evita doble descuento por reintentos o mensajes duplicados | 2026-03-13 |
| Marcar estado `Partial` en DDD con diseno listo y sin implementacion | Mantiene trazabilidad honesta del avance real | 2026-03-13 |
| Rechazar referencias ambiguas (`folio` + `operation_id_ref` conflictivos) | Evita mutaciones sobre pedido incorrecto por seleccion ambigua | 2026-03-17 |
| Definir `estado_pedido=cancelado` como fuente de verdad para bloqueo | Simplifica evaluacion de cancelacion y evita criterios mixtos | 2026-03-17 |
| Aplicar conversion obligatoria `g<->kg` con unidad canonica en gramos | Permite operar inventario mixto (`g`/`kg`) con calculo deterministico | 2026-03-17 |
| Mantener fallo parcial con reconciliacion manual | Prioriza trazabilidad y control operativo sobre rollback complejo en MVP | 2026-03-17 |
| Ejecutar `inventory.consume` solo por comando explicito en MVP y detras de flag | Reduce riesgo de descuentos silenciosos durante adopcion inicial | 2026-03-17 |

## Validation
- Unit tests focalizados:
  - `npx vitest run src/tools/order/inventoryConsume.test.ts src/runtime/conversationProcessor.test.ts src/config/appConfig.test.ts`
  - Resultado: `77 passed`
- Smoke intent nuevo:
  - `npm run smoke:inventory`
  - Resultado: `ok=true` en eventos `summary`, `confirm`, `missing_reference`, `cleanup`
- Smoke/integration summary registrado:
  - `npm run test:smoke-integration:summary`
  - Resultado: `Total 63 / Passed 63 / Failed 0`
- Security scan:
  - `npm run security:scan`
  - Resultado: sin patrones de secretos de alta confianza.

## Outcome
`inventory.consume` quedo implementado end-to-end en modo controlado (comando explicito + feature flag), con conversion obligatoria `g<->kg`, idempotencia por `operation_id`, reconciliacion manual para fallos parciales, cobertura unitaria/runtime y smoke registrado en el summary operativo.

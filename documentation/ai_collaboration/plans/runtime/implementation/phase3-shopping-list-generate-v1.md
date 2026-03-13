# Phase 3 - shopping.list.generate v1

> **Type:** `Implementation`
> **Status:** `Complete`
> **Created:** `2026-03-13`
> **Last Updated:** `2026-03-13`

## Cross-References
| Documento | Ruta | Uso |
|---|---|---|
| Roadmap | `documentation/bot-bakery.roadmap.md` | Backlog funcional fase 3 (`shopping.list.generate`) |
| DDD matrix | `documentation/ai_implementation/ddd-roadmap-coverage-matrix.md` | Estado de cobertura y siguiente accion |
| Runtime spec | `documentation/c4/ComponentSpecs/ConversationRuntime/Specs/conversation-processor.spec.md` | Reglas de enrutamiento conversacional |
| Tool specs | `documentation/c4/ComponentSpecs/Tools/Specs/` | Contrato de adapters read-only |

## Contexto
`shopping.list.generate` sigue en estado `Planned` y es el siguiente bloque aprobado de Fase 3. El objetivo es agregar una capacidad read-only que construya una lista de insumos sugerida para uno o varios pedidos sin mutar datos externos. El resultado debe mantener el patrón existente de detección determinista + adapter `gws` + respuestas claras en runtime.

## Alcance
### In Scope
- Agregar spec C4 para `shopping-list-generate`.
- Implementar tool read-only para leer `Pedidos` via `gws` y generar lista de insumos sugerida.
- Integrar ruta determinista en `conversationProcessor` (sin confirm flow por ser read-only).
- Agregar/ajustar tests unitarios de tool y runtime.
- Actualizar roadmap/DDD/system docs y artefactos de colaboración.

### Out of Scope
- Descuento automático de inventario (`inventory.consume`).
- Nuevas integraciones externas fuera de Sheets `gws`.
- Reescritura de estructura de tabs en Google Sheets.

## Approach
| # | Paso | Estado | Notas |
|---|---|---|---|
| 1 | Crear/actualizar diseño spec-first (C4 + roadmap + matriz) | Completed | Se agregaron specs C4 y alineación de docs base |
| 2 | Implementar tool `shopping-list-generate` (read-only `gws`) | Completed | Se implementó adapter con filtros `day|week|order_ref|lookup` y agregación de insumos sugerida |
| 3 | Integrar ruta en runtime + formato de respuesta | Completed | Detección determinista + prompt de dato faltante + respuesta estructurada |
| 4 | Ejecutar validaciones (tests + security scan) | Completed | Tests focalizados + suite completa + smoke summary + security scan |
| 5 | Cerrar artefactos (plan/index/handoff) | Completed | Plan/index/handoff cerrados en esta sesión |

## Decisions & Trade-offs
| Decision | Rationale | Date |
|---|---|---|
| Tratar `shopping.list.generate` como read-only sin confirmación | Alineado con `report.orders`/`order.lookup` y menor fricción operativa | 2026-03-13 |
| Incluir lista de insumos como “sugerida” con supuestos explícitos | Evita sobre-prometer precisión sin módulo de inventario/costeo completo | 2026-03-13 |

## Validation
- Tests a ejecutar:
  - `npm test -- src/tools/order/shoppingListGenerate.test.ts --run`
  - `npm test -- src/runtime/conversationProcessor.test.ts --run`
  - `npm run test:smoke-integration:summary`
  - `npm run security:scan`
- Criterio de aceptación:
  - Consulta de lista de insumos funciona por periodo o referencia de pedido.
  - No se ejecutan mutaciones ni confirm flow.
  - Cobertura de tests y documentación actualizada.

## Outcome
`shopping.list.generate` quedó implementado como capacidad read-only en Fase 3:
- Nuevo tool `src/tools/order/shoppingListGenerate.ts` con lectura `gws` de `Pedidos`, filtros por alcance y agregación de insumos/productos.
- Integración en runtime (`conversationProcessor`) con ruta determinista, sin confirm flow, y soporte de dato faltante (`shopping_list_query`).
- Cobertura de tests añadida en tool/runtime y validaciones completas ejecutadas.

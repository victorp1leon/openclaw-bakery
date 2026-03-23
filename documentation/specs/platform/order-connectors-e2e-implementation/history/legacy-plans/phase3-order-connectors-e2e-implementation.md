# Phase 3 - Order Connectors E2E Implementation

> **Type:** `Implementation`
> **Status:** `Complete`
> **Created:** `2026-03-04`
> **Last Updated:** `2026-03-04`

## Cross-References
| Documento | Ruta | Uso |
|---|---|---|
| Fase 3 spec foundation | `documentation/ai_collaboration/plans/platform/implementation/phase3-order-connectors-spec-v2-foundation.md` | Base contractual v2 |
| Trello adapter spec | `documentation/c4/ComponentSpecs/Tools/Specs/create-card.spec.md` | Contrato `create-card` |
| Sheets adapter spec | `documentation/c4/ComponentSpecs/Tools/Specs/append-order.spec.md` | Contrato `append-order` |
| DDD matrix | `documentation/ai_implementation/ddd-roadmap-coverage-matrix.md` | Tracking de cobertura |

## Contexto
Tras cerrar specs v2 de `order.create`, faltaba implementar conectores reales en runtime y asegurar cobertura de pruebas, con defaults seguros y hardening de seguridad equivalente a Fase 2.

## Alcance
### In Scope
- Implementar `createCardTool` real (Trello) con timeout/retries bounded.
- Implementar dedupe por `operation_id` en `createCardTool`.
- Implementar `appendOrderTool` real (Sheets webhook) con API key obligatoria en live.
- Agregar configuracion/env para conectores de order en `appConfig`.
- Cablear ejecucion real de `pedido` en `conversationProcessor` (confirm flow).
- Agregar smoke script `order` y tests de adapters/runtime/health/config.
- Actualizar documentacion operativa y tracking DDD.

### Out of Scope
- Validacion live en entorno productivo de Trello/Sheets.
- Implementacion de skills funcionales adicionales de Fase 3 (`order.update`, `order.cancel`, etc.).

## Approach
| # | Paso | Estado | Notas |
|---|---|---|---|
| 1 | Extender config + wiring runtime para order connectors | Completed | `appConfig`, `index`, `conversationProcessor` |
| 2 | Implementar adapters reales (`create-card`, `append-order`) | Completed | Timeout/retry/dry-run/auth/dedupe |
| 3 | Cubrir con pruebas y smoke command | Completed | `vitest` + `smoke:order` |
| 4 | Actualizar docs y artefactos de colaboracion | Completed | Config matrix, logging, DDD, roadmap, handoff |

## Decisions & Trade-offs
| Decision | Rationale | Date |
|---|---|---|
| Mantener `dry-run=1` por default en ambos conectores de order | Seguridad por defecto y adopcion gradual | 2026-03-04 |
| Requerir credenciales completas en live (`apiKey/token/listId` para Trello, `url/apiKey` para Sheets) | Evitar ejecuciones inseguras/no deterministas | 2026-03-04 |
| Dedupe Trello por marcador en descripcion (`operation_id`) antes de crear tarjeta | Mitigar duplicados en reintentos/fallas parciales | 2026-03-04 |

## Validation
- `npm test` -> PASS (`22` files, `102` tests)
- `npm run healthcheck` -> OK con conectores `order` en live configurados
- `npm run smoke:order` -> PASS live en entorno controlado (Trello + Sheets)
- `node scripts/check-order-webhook.js` -> PASS (`appended=true`) en tab `Pedidos`

## Outcome
`order.create` ya no depende de stubs:
- `create-card` implementa ruta real Trello con controles de resiliencia y dedupe.
- `append-order` implementa ruta real HTTP con API key hardening.
- Confirm flow de `pedido` en runtime ejecuta ambos conectores y maneja fallas con estado `failed` reintentable.
- Smoke/live validado en entorno real para ambos conectores.

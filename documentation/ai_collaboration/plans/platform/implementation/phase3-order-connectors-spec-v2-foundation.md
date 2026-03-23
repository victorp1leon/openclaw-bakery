# Phase 3 - Order Connectors Spec v2 Foundation

> **Type:** `Implementation`
> **Status:** `Complete`
> **Created:** `2026-03-04`
> **Last Updated:** `2026-03-04`

## Cross-References
| Documento | Ruta | Uso |
|---|---|---|
| Roadmap | `documentation/bot-bakery.roadmap.md` | Alcance de Fase 3 |
| DDD matrix | `documentation/ai_implementation/ddd-roadmap-coverage-matrix.md` | Tracking de cobertura |
| create-card spec | `documentation/specs/contracts/components/create-card.spec.md` | Contrato Trello v2 |
| append-order spec | `documentation/specs/contracts/components/append-order.spec.md` | Contrato Sheets v2 |

## Contexto
Fase 2 (`expense.add`) ya esta validada live y el siguiente riesgo operativo es Fase 3 (`order.create`) aun en stubs. Antes de implementar conectores reales, se requiere cerrar contratos v2 verificables para Trello y Sheets con foco en seguridad, idempotencia y comportamiento de retry.

## Alcance
### In Scope
- Crear plan formal para arranque de Fase 3.
- Actualizar `create-card.spec.md` a version connector-ready.
- Actualizar `append-order.spec.md` a version connector-ready.
- Actualizar matriz DDD para reflejar cierre de la etapa de diseno v2.
- Registrar handoff de la sesion.

### Out of Scope
- Implementacion de conectores reales en `src/tools/order/*`.
- Nuevas variables de entorno en `appConfig` y healthcheck.
- Pruebas unitarias/integracion de adapters de order.

## Approach
| # | Paso | Estado | Notas |
|---|---|---|---|
| 1 | Releer contexto operativo y specs actuales de tools order | Completed | Baseline: specs v1 stub |
| 2 | Definir contratos v2 para `create-card` y `append-order` | Completed | Incluye auth, timeout/retries, idempotencia |
| 3 | Actualizar tracking DDD y artefactos de colaboracion | Completed | Matriz, indice de planes y handoff |

## Decisions & Trade-offs
| Decision | Rationale | Date |
|---|---|---|
| Mantener `dry-run` por default en specs v2 | Seguridad por defecto hasta completar wiring de credenciales en runtime | 2026-03-04 |
| Exigir auth en live para ambos conectores (`create-card`, `append-order`) | Evita endpoints/integraciones sin control de acceso | 2026-03-04 |
| Definir dedupe por `operation_id` como requisito explicito en ambos adapters | Mantiene comportamiento determinista en reintentos/replays | 2026-03-04 |

## Validation
- Validacion documental: coherencia entre roadmap, specs de tools y matriz DDD.
- No se ejecutaron tests (cambio solo documental, sin cambios en runtime/codigo de adapters).

## Outcome
Se cerraron los contratos v2 para Fase 3 en C4 specs de tools (`create-card`, `append-order`) y se actualizo el tracking DDD para que el siguiente bloque de trabajo sea implementacion + tests de conectores reales.

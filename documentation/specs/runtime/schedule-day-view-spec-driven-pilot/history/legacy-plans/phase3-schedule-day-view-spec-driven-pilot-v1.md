# Phase 3 - schedule.day_view spec-driven pilot v1

> **Type:** `Implementation`
> **Status:** `Complete`
> **Created:** `2026-03-17`
> **Last Updated:** `2026-03-17`

## Cross-References
| Documento | Ruta | Uso |
|---|---|---|
| Canonical flow v1 | `documentation/ai_collaboration/spec-driven-flow-v1.md` | Flujo Discover -> Close para este piloto |
| Roadmap | `documentation/bot-bakery.roadmap.md` | Backlog funcional fase 3 (`schedule.day_view`) |
| DDD matrix | `documentation/ai_implementation/ddd-roadmap-coverage-matrix.md` | Estado de cobertura y siguiente accion |
| Runtime spec | `documentation/specs/contracts/components/conversation-processor.spec.md` | Contrato de routing read-only sin confirm flow |
| Tool spec | `documentation/specs/contracts/components/schedule-day-view.spec.md` | Contrato funcional/tecnico de `schedule.day_view` |
| System map | `documentation/ai_collaboration/system-map.md` | Contexto transversal de rutas implementadas |

## Contexto
Como parte del piloto del flujo canonico v1, se definio `schedule.day_view` como la siguiente capacidad a trabajar. Esta iteracion cubrio el flujo completo Discover -> Close, incluyendo implementacion runtime/tool, pruebas y smoke. El intent quedo read-only sobre `Pedidos` (Sheets `gws`) con timezone `America/Mexico_City`.

## Alcance
### In Scope
- Ejecutar el piloto de colaboracion v1 completo para `schedule.day_view` (Discover -> Close).
- Publicar spec de tool (`schedule-day-view`) y actualizar contrato de runtime.
- Implementar tool/runtime de `schedule.day_view`.
- Agregar cobertura de tests y smoke, registrando el intent en summary operativo.
- Reflejar estado real en matriz DDD y artefactos de colaboracion (plan/index/handoff).
- Derivar y cerrar tareas ejecutables de implementacion y validacion.

### Out of Scope
- Scope de `schedule.week_view` y `report.reminders`.
- Validacion live productiva de `schedule.day_view` sobre datos reales.

## Approach
| # | Paso | Estado | Notas |
|---|---|---|---|
| 1 | Discover (contexto + continuidad) | Completed | Checklist AGENTS completado: index, handoff relacionado, system-map e instrucciones spec-first |
| 2 | Specify (contrato funcional) | Completed | Spec nueva `schedule-day-view.spec.md` y ajuste runtime spec para routing read-only |
| 3 | Clarify (decisiones de negocio) | Completed | Cerrado con user: solo `schedule.day_view`, read-only, 3 bloques de salida, `Pedidos` + `America/Mexico_City` |
| 4 | Plan + Tasks (este artefacto) | Completed | Plan creado con tareas derivadas y dependencias |
| 5 | Implement (runtime + tool wiring) | Completed | Tool `scheduleDayView`, routing read-only, prompt faltante y wiring `index` |
| 6 | Validate (unit/smoke/security) | Completed | Vitest focalizado, `smoke:schedule`, smoke+integration summary y security scan en verde |
| 7 | Close (plan complete + index/handoff final) | Completed | Plan/index/handoff alineados en `Complete` |

## Tasks (Derived)
| ID | Task | Depends On | Estado |
|---|---|---|---|
| T1 | Implementar tool `scheduleDayView` (lectura `Pedidos`, filtros day, bloques `deliveries/preparation/suggestedPurchases`) | Specify | Completed |
| T2 | Integrar routing determinista en `conversationProcessor` sin confirm flow | T1 | Completed |
| T3 | Ajustar parser/intent hints para consultas de agenda diaria (`hoy`, fecha explicita) | T2 | Completed |
| T4 | Agregar tests de tool y runtime para happy-path + errores deterministas | T1, T2 | Completed |
| T5 | Crear/registrar smoke `schedule-day-view` en summary | T4 | Completed |
| T6 | Ejecutar validacion completa y cerrar artefactos (`plan/index/handoff`) | T5 | Completed |

## Decisions & Trade-offs
| Decision | Rationale | Date |
|---|---|---|
| Iniciar piloto v1 con `schedule.day_view` (no `schedule.week_view`) | Alcance acotado y menor riesgo para validar flujo nuevo | 2026-03-17 |
| Definir `schedule.day_view` como read-only sin confirm flow | Consistencia con `report.orders` y menor friccion operativa | 2026-03-17 |
| Salida obligatoria en 3 bloques (`deliveries`, `preparation`, `suggestedPurchases`) | Cobertura directa del uso diario del negocio en una sola respuesta accionable | 2026-03-17 |
| Fuente unica `Pedidos` + timezone default `America/Mexico_City` | Determinismo operativo y menor ambiguedad de fechas | 2026-03-17 |

## Validation
- `npx vitest run src/tools/order/scheduleDayView.test.ts src/runtime/conversationProcessor.test.ts`
  - Resultado: `58 passed`.
- `npm run smoke:schedule`
  - Resultado: `schedule_day_view_smoke_done ok=true` (mock mode).
- `npm run test:smoke-integration:summary`
  - Resultado: `Total 69 / Passed 69 / Failed 0`.
- `npm run security:scan`
  - Resultado: sin hallazgos de secretos de alta confianza.

## Outcome
`schedule.day_view` quedo implementado end-to-end como intent read-only:
- Tool nuevo `src/tools/order/scheduleDayView.ts` con lectura `gws` de `Pedidos`, exclusion de cancelados y salida en 3 bloques (`deliveries`, `preparation`, `suggestedPurchases`).
- Runtime integrado sin confirm flow con soporte de dato faltante (`schedule_day_query`).
- Cobertura de tests en tool/runtime y smoke dedicado registrado en summary operativo.
- Piloto del flujo canonico v1 cerrado en `Complete`.

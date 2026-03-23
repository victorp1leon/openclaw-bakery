# Phase 3 - mutation skills parser extraction v1

> **Type:** `Refactoring`
> **Status:** `Complete`
> **Created:** `2026-03-17`
> **Last Updated:** `2026-03-17`

## Cross-References
| Documento | Ruta | Uso |
|---|---|---|
| Runtime spec | `documentation/specs/contracts/components/conversation-processor.spec.md` | Mantener contrato sin cambios funcionales |
| Plan inventory.consume | `documentation/ai_collaboration/plans/runtime/implementation/phase3-inventory-consume-spec-first-foundation.md` | Base funcional previa |
| Runtime source | `src/runtime/conversationProcessor.ts` | Punto de extracción de parsers mutables |
| Skills source | `src/skills/` | Destino del refactor |

## Contexto
Los parsers determinísticos de mutaciones (`order.update`, `order.cancel`, `payment.record`, `inventory.consume`) viven hoy dentro de `conversationProcessor`. Esto mezcla lógica de interpretación con orquestación de estado/confirmación y dificulta mantenimiento. Se busca extraerlos a `src/skills` sin alterar comportamiento observable.

## Alcance
### In Scope
- Extraer parsers de mutaciones a una skill reusable en `src/skills`.
- Reemplazar helpers locales en runtime por imports de skill.
- Agregar/ajustar pruebas para garantizar paridad de comportamiento.
- Actualizar artefactos de plan/index/handoff al cierre.

### Out of Scope
- Cambiar contratos de tools o reglas de negocio de mutaciones.
- Rediseñar `intentRouter` principal.
- Modificar flujo de confirmación en runtime.

## Approach
| # | Paso | Estado | Notas |
|---|---|---|---|
| 1 | Crear skill parser de mutaciones en `src/skills` | Complete | `src/skills/mutationIntentDrafts.ts` |
| 2 | Integrar skill en `conversationProcessor` | Complete | Runtime usa imports de skill; bloque duplicado eliminado |
| 3 | Cubrir con tests unitarios + runtime regression | Complete | `npx vitest run src/skills/mutationIntentDrafts.test.ts src/runtime/conversationProcessor.test.ts` |
| 4 | Cerrar plan/index/handoff | Complete | Artefactos de colaboración actualizados |

## Decisions & Trade-offs
| Decision | Rationale | Date |
|---|---|---|
| Extraer en un módulo skill único (v1) en lugar de 4 archivos separados | Menor riesgo de regresión y cambio incremental reversible | 2026-03-17 |

## Validation
- Tests a ejecutar:
  - `npx vitest run src/skills/mutationIntentDrafts.test.ts src/runtime/conversationProcessor.test.ts`
- Criterio de aceptación:
  - Paridad de respuestas y flujos confirm/cancel para mutaciones existentes.
  - Sin cambios funcionales no solicitados en runtime.

## Outcome
Refactor completado con paridad funcional:
- Parsers/helpers de mutaciones movidos a `src/skills/mutationIntentDrafts.ts`.
- Runtime quedó como orquestador, sin duplicación de parseo de mutaciones.
- `PendingAction` ahora incluye `inventory.consume` en `src/state/stateStore.ts`.
- Validación ejecutada con 63 tests pasando.

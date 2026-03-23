# Token Efficiency Codex Operational v2

> **Type:** `Implementation`
> **Status:** `Complete`
> **Created:** `2026-03-23`
> **Last Updated:** `2026-03-23`

## Cross-References
| Documento | Ruta | Uso |
|---|---|---|
| Gate de aprobacion | `AGENTS.md` | Regla de ejecucion con `apruebo` |
| Plan previo completado | `documentation/ai_collaboration/plans/platform/implementation/token-efficiency-codex-rule-v1.md` | Trazabilidad del baseline ya implementado |
| Regla vigente | `.codex/rules/token-efficiency-codex.md` | Base actual a extender |
| Tips origen | `.codex/token-optimizacion-tips.md` | Fuente de recomendaciones pendientes |
| Playbook operativo | `documentation/ai_collaboration/spec-driven-flow-v1.md` | Integracion de practicas en flujo de colaboracion |
| Checklist reusable | `documentation/ai_collaboration/references/operations/token-efficient-session-checklist.md` | Plantilla operativa pre/in/post-session |

## Contexto
Existe una base v1 de optimizacion de tokens ya completada, pero quedan pendientes componentes operativos para estandarizar la ejecucion entre sesiones: checklists, refuerzo en playbook y practica consistente de sesiones enfocadas. El objetivo de esta iteracion es cerrar esos gaps sin afectar runtime ni integraciones externas.

## Alcance
### In Scope
- Ajustes documentales en reglas/playbook/checklists de colaboracion.
- Consolidar criterios operativos para tareas token-efficient (sin reducir calidad/safety).
- Mantener trazabilidad con plan/index/handoff.

### Out of Scope
- Cambios en `src/` runtime, herramientas o integraciones.
- Automatizacion de metricas de tokens en CI o pipelines tecnicos.
- Cambios de contratos C4 o APIs funcionales.

## Approach
| # | Paso | Estado | Notas |
|---|---|---|---|
| 1 | Definir checklist operativo pre/post-task para eficiencia de contexto | Complete | Regla `.codex/rules/token-efficiency-codex.md` extendida con checklist y cadencia de sesiones |
| 2 | Actualizar playbook con practica de sesiones cortas con continuidad documental | Complete | `spec-driven-flow-v1.md` actualizado sin crear flujo alterno |
| 3 | Registrar plantilla/checklist reusable en artefactos locales de colaboracion | Complete | Nueva plantilla en `documentation/ai_collaboration/references/operations/` y registro en READMEs |
| 4 | Validar consistencia documental y cerrar artefactos de colaboracion | Complete | Plan/index/handoff sincronizados en estado final |

### Detalle Operativo - Paso 2
#### Objetivo del paso
Integrar una practica de sesiones cortas que reduzca contexto innecesario y preserve continuidad documental estricta entre sesiones.

#### Protocolo de sesion corta (entrada -> ejecucion -> salida)
1. Entrada (maximo recomendado: 5-10 minutos)
- Revisar `AGENTS.md` (gates vigentes) y `plans/_index.md` (estado actual).
- Revisar el plan activo y el ultimo handoff asociado.
- Declarar micro-objetivo de la sesion en una frase accionable (un unico resultado verificable).

2. Ejecucion (bloque enfocado)
- Limitar alcance al micro-objetivo definido; evitar abrir lineas de trabajo paralelas no criticas.
- Priorizar cambios pequenos y trazables (docs o codigo) alineados al flujo canonico.
- Si aparece trabajo nuevo fuera de alcance, registrarlo como `follow-up` en el plan/handoff, sin mezclarlo en el mismo bloque.

3. Salida (cierre obligatorio de bloque)
- Actualizar plan con progreso real (estado/notas de pasos tocados).
- Si cambia estado global del plan, sincronizar `documentation/ai_collaboration/plans/_index.md`.
- Registrar handoff corto con: que se hizo, estado actual, riesgos/limitaciones y siguiente paso unico recomendado.

#### Checklist minimo por etapa del flujo canonico
| Etapa | Minimo requerido para sesion corta |
|---|---|
| Discover | Referencias minimas revisadas (plan + ultimo handoff + sistema/specs aplicables) |
| Specify | Confirmar que el cambio mantiene objetivo funcional ya definido; si cambia alcance, registrar decision |
| Clarify | Resolver solo ambiguedades bloqueantes; no abrir discovery adicional no esencial |
| Plan | Reflejar micro-objetivo y avance real en `Approach`/notas |
| Tasks | Ejecutar una unidad de trabajo verificable por bloque |
| Implement | Aplicar cambios pequenos y coherentes con guardrails |
| Validate | Validacion proporcional al riesgo y evidencia real reportada |
| Close | Sincronizar plan/index/handoff segun estado final del bloque |

#### Criterios de aceptacion del paso 2
- Existe protocolo explicito de sesion corta con reglas de entrada, ejecucion y salida.
- El protocolo referencia el flujo canonico completo sin introducir un flujo alterno.
- Cada sesion corta deja continuidad verificable via plan + (index cuando aplique) + handoff.

## Decisions & Trade-offs
| Decision | Rationale | Date |
|---|---|---|
| Guardar v2 como plan nuevo y pendiente (`Not Started`) | Preserva historial de v1 completo y permite activar cuando se priorice | 2026-03-23 |
| Mantener alcance docs-only | Minimiza riesgo y evita impacto en runtime/integraciones | 2026-03-23 |
| Integrar sesiones cortas como practica operativa del flujo canonico | Mejora eficiencia de contexto sin introducir playbooks paralelos | 2026-03-23 |

## Validation
- Verificaciones ejecutadas:
  - `rg -n "Operational Checklist|Session Cadence" .codex/rules/token-efficiency-codex.md`
  - `rg -n "Short Session Practice|Protocolo recomendado por bloque" documentation/ai_collaboration/spec-driven-flow-v1.md`
  - `test -f documentation/ai_collaboration/references/operations/token-efficient-session-checklist.md`
  - `rg -n "token-efficient-session-checklist|references/operations" documentation/ai_collaboration/references/README.md documentation/ai_collaboration/README.md`
  - `rg -n "token-efficiency-codex-operational-v2" documentation/ai_collaboration/plans/_index.md`
  - `test -f documentation/ai_collaboration/plans/platform/sessions/session-handoff-2026-03-23-token-efficiency-codex-operational-v2-execution.md`
- Criterio de aceptacion:
  - Artefactos operativos agregados y referenciados; plan/index/handoff cerrados de forma consistente.

## Outcome
Implementacion documental completada: la regla de eficiencia de tokens incorpora checklist pre/post + cadencia de sesiones cortas, el flujo canonico integra la practica operativa sin crear variantes paralelas y existe plantilla reusable para continuidad entre sesiones.

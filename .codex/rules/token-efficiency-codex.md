# Rule: Token Efficiency (Codex, Safety-First)

Status: In Use
Adoption Since: 2026-03-23
Runbook: `documentation/ai_collaboration/references/operations/token-efficient-session-runbook.md`
Quick Card: `documentation/ai_collaboration/references/operations/token-efficient-session-quick-card.md`

## Policy
- Optimizar consumo de tokens sin sacrificar trazabilidad, validacion ni cumplimiento de `AGENTS.md`.
- Mantener prompts y tareas con alcance explicito para reducir lecturas innecesarias.
- Priorizar contexto minimo suficiente; evitar contexto minimo insuficiente.

## Required Behavior
- Al iniciar una tarea, declarar alcance concreto (objetivo + rutas principales) antes de explorar en profundidad.
- En exploracion, preferir comandos acotados (`rg --files`, `rg -n`, `sed -n`) y evitar salidas masivas sin filtro.
- Para cambios en un mismo archivo, agrupar modificaciones en una sola pasada cuando sea viable.
- Reutilizar artefactos de continuidad (`plans/_index.md`, handoff, system-map) en vez de reinyectar contexto largo manualmente.
- Mantener respuestas finales concisas por defecto; expandir detalle solo cuando el riesgo o la complejidad lo requieran.

## Operational Checklist (Pre-Task)
- Definir micro-objetivo unico y verificable antes de ejecutar herramientas.
- Limitar lectura inicial a artefactos minimos: `AGENTS.md`, plan activo, ultimo handoff, `_index.md` y specs necesarias.
- Declarar rutas objetivo para evitar exploracion amplia no necesaria.
- Confirmar si la tarea requiere plan/handoff segun guardrails vigentes.

## Operational Checklist (Post-Task)
- Registrar estado real del plan (`Not Started` -> `In Progress` -> `Complete`).
- Sincronizar `documentation/ai_collaboration/plans/_index.md` cuando cambie el estado global del plan.
- Escribir handoff corto con: cambios, estado actual, riesgos/limitaciones, siguiente paso recomendado.
- Reportar validaciones ejecutadas y limitaciones reales de validacion.

## Session Cadence
- Operar en sesiones cortas y enfocadas (objetivo unico por bloque) para evitar acumulacion de contexto.
- Tratar cada bloque como ciclo completo de continuidad documental: avance en plan + index (si aplica) + handoff.
- Esta cadencia es una practica operativa sobre el flujo canonico, no un flujo alterno.

## Anti-Patterns (Do Not Apply)
- Prohibir lecturas del codebase cuando la tarea requiere validacion real.
- Responder "solo codigo" cuando el flujo exige evidencia de validacion o estado operativo.
- Saltar pasos de investigacion/spec-first para ahorrar tokens.

## Verification
- En cierre de tarea, reportar explicitamente:
  - comandos de validacion ejecutados (si aplica)
  - limites de validacion (si no se pudo ejecutar algo)
  - archivos modificados relevantes

## Notes
- Esta regla adapta recomendaciones de optimizacion de contexto al flujo operativo de OpenClaw Bakery.
- Si existe conflicto entre ahorro de tokens y seguridad/calidad, prevalece seguridad/calidad.

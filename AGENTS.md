# AGENTS.md - OpenClaw Bakery

## Purpose
Reglas operativas para colaborar con Codex en este repositorio sin perder continuidad entre sesiones.

## Session Start Checklist
1. Lee `documentation/ai_collaboration/plans/_index.md`.
2. Si existe una tarea relacionada, lee su ultimo handoff en `documentation/ai_collaboration/plans/**/sessions/`.
3. Lee `documentation/ai_collaboration/system-map.md` para contexto transversal.
4. Lee docs tecnicas aplicables (`documentation/c4/`, `documentation/adr/`, `documentation/ai_implementation/`).

## Workflow (Complex Tasks)
1. **Research:** inspecciona codigo y specs antes de editar.
2. **Plan:** crea/actualiza plan en `documentation/ai_collaboration/plans/` cuando la tarea no sea trivial.
3. **Implement:** aplica cambios respetando patrones existentes y actualiza tests si cambia logica.
4. **Close:** actualiza plan + `_index.md` y escribe handoff corto.

## When A Plan Is Mandatory
- Cambios multi-archivo o multi-sesion.
- Cambios de arquitectura, contratos o integraciones.
- Refactors con riesgo de regresion.
- Reviews formales con hallazgos.

## Engineering Rules
- Mantener approach spec-first segun `documentation/ai_implementation/implementation-instructions.md`.
- No ejecutar integraciones externas sin flujo de confirmacion de negocio.
- Preferir cambios pequenos y verificables.
- Si no puedes validar con tests/lint, declarar explicitamente la limitacion.

## Core Project Map
- Runtime: `src/runtime/`
- Guards: `src/guards/`
- Skills: `src/skills/`
- OpenClaw adapter: `src/openclaw/`
- State: `src/state/`
- Tools: `src/tools/`
- Channel adapters: `src/channel/`

## Collaboration Artifacts
- Playbook: `documentation/ai_collaboration/codex-collaboration-playbook.md`
- System map: `documentation/ai_collaboration/system-map.md`
- Plan template: `documentation/ai_collaboration/plans/_plan-template.md`
- Session handoff template: `documentation/ai_collaboration/plans/_session-handoff-template.md`

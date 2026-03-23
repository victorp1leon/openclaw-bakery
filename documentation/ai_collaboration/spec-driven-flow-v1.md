# Spec-Driven Collaboration Flow v1 (OpenClaw Bakery)

Status: Proposed
Last Updated: 2026-03-23

## Objective
Definir un flujo canonico unico, estructurado y repetible para colaboracion Developer + Codex, inspirado en Spec-Driven Development, pero adaptado a los guardrails operativos de OpenClaw Bakery.

## Why This Exists
- Hoy el proceso funciona, pero esta distribuido en varios artefactos.
- Necesitamos una ruta unica para reducir ambiguedad y mejorar onboarding.
- Queremos conservar lo que ya funciona (gates, plan/handoff, validaciones) y sumar estructura de especificacion por feature.

## Design Principles
1. Spec-first obligatorio para cambios no triviales.
2. Un solo flujo canonico para runtime y plataforma.
3. Confirmacion explicita (`apruebo`) antes de editar/commitear.
4. Trazabilidad completa: plan, validacion y handoff.
5. Adopcion gradual (sin romper flujo actual de entrega).

## Canonical Flow (v1)
1. **Discover**
- Revisar contexto base (`AGENTS.md`, `plans/_index.md`, handoff reciente, system-map, specs aplicables).
- Definir alcance inicial y riesgos.

2. **Specify**
- Redactar/actualizar especificacion funcional de la capacidad.
- Enfocar en **que** y **por que**, no en detalles de implementacion.
- Resolver ambiguedades de negocio criticas antes de pasar a plan tecnico.

3. **Clarify**
- Cerrar decisiones abiertas con impacto en alcance, seguridad o UX.
- Limitar preguntas a las estrictamente necesarias para evitar bloqueo.

4. **Plan**
- Crear/actualizar plan de implementacion en `documentation/ai_collaboration/plans/`.
- Definir alcance, approach por fases, decisiones, validacion y criterios de cierre.

5. **Tasks**
- Derivar tareas ejecutables en orden de dependencia desde el plan/spec.
- Asegurar trazabilidad por historia/capacidad cuando aplique.

6. **Implement**
- Ejecutar cambios con gate de aprobacion (`apruebo`).
- Mantener cambios pequenos, verificables y alineados a specs.

7. **Validate**
- Ejecutar validacion proporcional al riesgo (unit/smoke/live segun contexto).
- Reportar comandos, resultados y limitaciones reales.

8. **Close**
- Actualizar estado final de plan.
- Actualizar `plans/_index.md`.
- Escribir handoff corto accionable.

## Mandatory Artifacts by Stage
- Discover: referencias consultadas (en plan o respuesta de cierre).
- Specify: spec/contrato actualizado en `documentation/specs/**` (C4 como referencia arquitectonica cuando aplique).
- Plan: archivo en `plans/<domain>/implementation/*.md`.
- Tasks: seccion de tareas en plan (`Approach`) o artefacto equivalente.
- Validate: evidencia de comandos/resultados.
- Close: index + handoff.

## Mapping: Spec-Kit vs OpenClaw
| Spec-Kit Stage | OpenClaw Stage | Artifact Canonico |
|---|---|---|
| constitution | Discover | `AGENTS.md`, `.codex/rules/*` |
| specify | Specify | `documentation/specs/**` + roadmap/docs funcionales (C4 como referencia) |
| clarify | Clarify | decisiones en plan |
| plan | Plan | `documentation/ai_collaboration/plans/...` |
| tasks | Tasks | `Approach` del plan (+ tests en `Validation`) |
| implement | Implement | `src/*`, `scripts/*`, docs asociadas |
| (quality gates) | Validate | tests/smoke/live evidencia |
| closeout | Close | `_index.md` + `sessions/*` |

## Adoption Strategy (Safe Transition)
### Phase A - Alignment (actual)
- Publicar flujo v1 sin romper flujo existente.
- Usar esta guia como referencia en sesiones de planeacion.

### Phase B - Pilot
- Aplicar flujo completo en una capacidad nueva de bajo/medio riesgo (ej. `schedule.day_view`).
- Medir claridad, friccion y tiempo de ciclo.

### Phase C - Standardization
- Actualizar playbook y reglas para declarar v1 como default.
- Mantener legacy flow como referencia historica durante ventana de transicion.

## Non-Goals (v1)
- Reemplazar herramientas actuales de inmediato.
- Introducir automatizacion CI adicional en esta etapa.
- Cambiar contratos productivos por adoptar el flujo.

## Success Criteria
- Existe una guia canonica unica para el flujo.
- Cada tarea compleja nueva usa Discover->Close con artefactos completos.
- Menos decisiones abiertas tardias durante implementacion.
- Menor re-trabajo por ambiguedad de especificacion.

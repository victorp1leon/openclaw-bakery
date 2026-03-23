# Token-Efficient Session Runbook (Mini, 3 Scenarios)

Status: In Use
Last Updated: 2026-03-23

## Purpose
Estandarizar la adopcion de sesiones cortas token-efficient sin perder continuidad documental ni romper el flujo canonico.

## Prerequisites
- Regla activa: `.codex/rules/token-efficiency-codex.md`
- Checklist base: `documentation/ai_collaboration/references/operations/token-efficient-session-checklist.md`
- Flujo canonico: `documentation/ai_collaboration/spec-driven-flow-v1.md`

## Operating Rule
Cada bloque de trabajo debe cerrar con evidencia minima de continuidad:
1. plan actualizado
2. `_index.md` sincronizado si cambia estado global
3. handoff corto cuando aplique por sesion/plan

## Scenario 1: Docs-Only Alignment Block
Use when: cambio documental acotado (regla, README, checklist, playbook).

1. Entrada
- Definir micro-objetivo: "actualizar X documento con Y criterio".
- Revisar plan activo + ultimo handoff.

2. Ejecucion
- Editar solo rutas objetivo.
- Evitar abrir frentes nuevos fuera del objetivo.

3. Salida
- Marcar progreso real en plan.
- Sincronizar `_index.md` si cambia estado.
- Registrar handoff corto con siguiente paso unico.

## Scenario 2: Focused Implementation Block
Use when: ajuste pequeno de logica en runtime/tools dentro de una capacidad ya especificada.

1. Entrada
- Confirmar alcance tecnico exacto y archivo(s) objetivo.
- Confirmar criterios de validacion minima.

2. Ejecucion
- Implementar en un solo bloque pequeno.
- Mantener cambios verificables y trazables.

3. Salida
- Ejecutar validacion proporcional al riesgo.
- Reportar comandos y limitaciones reales.
- Cerrar continuidad documental (plan/index/handoff segun corresponda).

## Scenario 3: Sensitive Validation Block (Preview-First)
Use when: scripts potencialmente mutables o integraciones externas.

1. Entrada
- Declarar modo efectivo (`preview` o equivalente).
- Evitar heredar flags live desde `.env` durante validacion.

2. Ejecucion
- Correr primero `preview`/dry-run.
- Revisar resultados antes de cualquier accion mutable.

3. Salida
- Registrar evidencia de validacion en plan/handoff.
- Si hubo limitacion (sin acceso live, sandbox, etc.), declararla explicitamente.

## Adoption Signals
- Se usa checklist pre/in/post en sesiones complejas.
- Menos exploracion amplia no necesaria.
- Retoma entre sesiones sin recarga larga de contexto.

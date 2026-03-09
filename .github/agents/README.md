# Internal Agents (OpenClaw Bakery)

Status: Draft  
Last Updated: 2026-03-09

## Purpose
Scaffolding de perfiles de agente para tareas recurrentes de arquitectura, review y hardening operativo en este repositorio.

## Available Agents
- `architect.agent.md`
- `runtime-reviewer.agent.md`
- `ops-hardening.agent.md`

## Usage Guidance
1. Elegir el agente segun objetivo principal de la sesion.
2. Mantener alcance acotado al rol definido en el archivo.
3. Si la tarea cambia de fase (ej. de plan a implementacion), cambiar de agente.
4. Mantener compatibilidad con `AGENTS.md` y el flujo de `documentation/ai_collaboration/`.

## Role Mapping
- `architect`: diseno, planificacion, trade-offs y artefactos de decision.
- `runtime-reviewer`: code review orientado a riesgos, regresiones y cobertura.
- `ops-hardening`: seguridad y operacion en cambios con integraciones o despliegue.

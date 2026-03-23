# Agents Scaffolding Foundation

> **Type:** `Implementation`
> **Status:** `Complete`
> **Created:** `2026-03-09`
> **Last Updated:** `2026-03-09`

## Cross-References
| Documento | Ruta | Uso |
|---|---|---|
| Adaptation baseline | `documentation/ai_collaboration/plans/platform/implementation/copilot-instructions-adaptation-foundation.md` | Continuidad del trabajo previo |
| Prior handoff | `documentation/ai_collaboration/plans/platform/sessions/session-handoff-2026-03-09-copilot-instructions-adaptation-foundation.md` | Open issue de adopcion de agentes |
| AGENTS | `AGENTS.md` | Reglas de colaboracion y quality bar |
| Collaboration playbook | `documentation/ai_collaboration/spec-driven-flow-v1.md` | Flujo obligatorio research/plan/implement/close |

## Contexto
Se requiere materializar la adopcion de perfiles de agente internos para reducir drift en sesiones de arquitectura, review y hardening operativo. El objetivo es habilitar scaffolding reusable en el repo, sin cambiar runtime ni integraciones productivas.

## Alcance
### In Scope
- Crear carpeta `.github/agents/` con perfiles base.
- Definir agentes `architect`, `runtime-reviewer`, `ops-hardening`.
- Agregar documento indice para descubrimiento/uso de agentes.
- Cerrar con actualizacion de `_index.md` y session handoff.

### Out of Scope
- Cambios de codigo en `src/`.
- Integraciones con tooling externo de instalacion de agentes.
- Implementar workflow automatizado de activacion de modo.

## Approach
| # | Paso | Estado | Notas |
|---|---|---|---|
| 1 | Diseñar contrato base de agentes | Completed | Frontmatter + secciones de proposito, comportamiento y limites |
| 2 | Crear perfiles iniciales en `.github/agents/` | Completed | `architect`, `runtime-reviewer`, `ops-hardening` |
| 3 | Documentar descubrimiento y uso | Completed | `README.md` dentro de `.github/agents/` |
| 4 | Registrar cierre en artefactos de colaboracion | Completed | Plan, index y handoff actualizados |

## Decisions & Trade-offs
| Decision | Rationale | Date |
|---|---|---|
| Mantener perfiles como scaffolding documental | Evita acoplarse a una sola herramienta de agente y permite iteracion local | 2026-03-09 |
| Separar `runtime-reviewer` de `ops-hardening` | Distingue calidad de codigo vs seguridad/operacion para revisiones mas precisas | 2026-03-09 |
| Reusar lenguaje operativo del repo (es/en) | Mantiene continuidad con docs actuales y compatibilidad con tooling | 2026-03-09 |

## Validation
- Checks ejecutados:
  - Verificacion de presencia de archivos en `.github/agents/`.
  - Revision de consistencia de formato y rutas.
- Criterio de aceptacion:
  - Existen tres perfiles de agente con rol y limites claros.
  - Existe indice de agentes en `.github/agents/README.md`.

## Outcome
Quedo instalado un baseline de agentes internos orientado a arquitectura, review y hardening que complementa la capa de instrucciones/skills agregada previamente.

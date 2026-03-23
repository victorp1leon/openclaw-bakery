# Meta Governance Instructions Adoption

> **Type:** `Implementation`
> **Status:** `Complete`
> **Created:** `2026-03-09`
> **Last Updated:** `2026-03-09`

## Cross-References
| Documento | Ruta | Uso |
|---|---|---|
| Prior adaptation baseline | `documentation/ai_collaboration/plans/platform/implementation/copilot-instructions-adaptation-foundation.md` | Continuidad de adopcion |
| Agents scaffolding | `documentation/ai_collaboration/plans/platform/implementation/agents-scaffolding-foundation.md` | Coherencia con perfiles de agente |
| AGENTS | `AGENTS.md` | Reglas operativas |

## Contexto
Despues de adoptar instrucciones base y agentes internos, faltaba agregar meta-reglas para estandarizar como se crean futuras instructions y chatmodes en este repo.

## Alcance
### In Scope
- Agregar `meta-instructions.instructions.md` adaptado a OpenClaw Bakery.
- Agregar `meta-chatmode.instructions.md` adaptado a OpenClaw Bakery.
- Actualizar artefactos de colaboracion (index + handoff).

### Out of Scope
- Crear chatmodes concretos.
- Cambios en runtime o codigo de producto.

## Approach
| # | Paso | Estado | Notas |
|---|---|---|---|
| 1 | Definir estandar para instructions | Completed | Frontmatter, estructura y checklist de validacion |
| 2 | Definir estandar para chatmodes | Completed | Naming, secciones y criterios de creacion |
| 3 | Registrar cierre de sesion | Completed | Index y handoff actualizados |

## Decisions & Trade-offs
| Decision | Rationale | Date |
|---|---|---|
| Mantener meta-reglas dentro de `.github/instructions/` | Centraliza governance de IA en un solo punto del repo | 2026-03-09 |
| No crear chatmodes adicionales aun | Evita sobre-ingenieria hasta observar necesidad recurrente | 2026-03-09 |

## Validation
- Verificacion de existencia y formato de ambos archivos `meta-*`.
- Verificacion de consistencia con reglas existentes del repo.

## Outcome
El repositorio ahora tiene gobernanza minima para evolucionar instructions y chatmodes de manera consistente y mantenible.

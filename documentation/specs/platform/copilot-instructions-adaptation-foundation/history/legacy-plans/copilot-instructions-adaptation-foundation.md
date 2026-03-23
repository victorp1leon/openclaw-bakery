# Copilot Instructions Adaptation Foundation

> **Type:** `Implementation`
> **Status:** `Complete`
> **Created:** `2026-03-09`
> **Last Updated:** `2026-03-09`

## Cross-References
| Documento | Ruta | Uso |
|---|---|---|
| AGENTS | `AGENTS.md` | Reglas operativas y criterio de plan obligatorio |
| Collaboration playbook | `documentation/ai_collaboration/codex-collaboration-playbook.md` | Flujo de research/plan/implement/close |
| Spec-first instructions | `documentation/ai_implementation/implementation-instructions.md` | Alineacion con delivery spec-first |
| Copilot instructions repo | `/home/victor/copilot-instructions/README.md` | Fuente de patrones para adaptar |

## Contexto
Se requiere adaptar patrones del repositorio `copilot-instructions` al flujo de OpenClaw Bakery sin importar contenido especifico de C#/.NET. El objetivo es fortalecer la gobernanza de IA local con instrucciones reutilizables y un formato de skills mas consistente.

## Alcance
### In Scope
- Crear capa inicial de instrucciones en `.github/instructions/`.
- Definir template base para skills en `skills/_template/SKILL.md`.
- Migrar `skills/order.create` y `skills/expense.add` al nuevo formato.
- Cerrar con actualizacion de indice y handoff.

### Out of Scope
- Portar instrucciones C#/.NET o plugins del repo externo.
- Cambios de runtime, integraciones o comportamiento de produccion.
- Publicacion externa del framework de instrucciones.

## Approach
| # | Paso | Estado | Notas |
|---|---|---|---|
| 1 | Revisar baseline de colaboracion y specs del repo | Completed | Incluye AGENTS, playbook, system-map e implementation instructions |
| 2 | Inspeccionar patrones de instructions/skills/agents/plugins externos | Completed | Se priorizo estructura y gobernanza sobre contenido tecnologico |
| 3 | Crear instrucciones adaptadas para OpenClaw | Completed | 4 archivos iniciales en `.github/instructions/` |
| 4 | Estandarizar formato de skills locales | Completed | Template + upgrade de `order.create` y `expense.add` |
| 5 | Registrar cierre en artefactos de colaboracion | Completed | Plan, index y session handoff actualizados |

## Decisions & Trade-offs
| Decision | Rationale | Date |
|---|---|---|
| Adaptar solo patrones transversales (estructura, flujo, seguridad) | Evita importar reglas acopladas a C# no aplicables al stack TypeScript/OpenClaw | 2026-03-09 |
| Mantener instrucciones en ingles tecnico y contenido operativo en espanol neutro | Facilita compatibilidad con tooling de Copilot y continuidad con docs del repo | 2026-03-09 |
| No adoptar regla de follow-up agresiva (97% confidence) | Entraria en conflicto con modo de ejecucion pragmatica del repo y AGENTS | 2026-03-09 |

## Validation
- Checks ejecutados:
  - Verificacion de archivos creados y actualizados via shell.
  - Revision de consistencia de rutas y nombres.
- Criterio de aceptacion:
  - Existen 4 instrucciones nuevas en `.github/instructions/`.
  - Existe `skills/_template/SKILL.md`.
  - Skills `order.create` y `expense.add` usan frontmatter y secciones estandar.

## Outcome
Se agrego una base de gobernanza reutilizable para IA en el repo y se normalizo el formato de skills existentes para facilitar mantenibilidad, descubrimiento y evolucion futura.

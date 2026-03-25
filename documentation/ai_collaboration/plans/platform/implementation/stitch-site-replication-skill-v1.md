# Stitch Site Replication Skill v1

> **Type:** `Implementation`
> **Status:** `Complete`
> **Created:** `2026-03-25`
> **Last Updated:** `2026-03-25`

## Cross-References
| Documento | Ruta | Uso |
|---|---|---|
| Mejora detectada en sesion previa | `documentation/ai_collaboration/plans/platform/sessions/session-handoff-2026-03-25-hadicakes-site-new-stitch-replication-v1.md` | Fuente de la mejora reusable aprobada por el usuario |
| Guia de creacion de skills | `.codex/skills/skill-creator/SKILL.md` | Estructura y guardrails del skill nuevo |
| Sincronizacion de registro | `.codex/skills/skill-registry-sync/SKILL.md` | Proceso para actualizar `.codex/skill-registry.md` |

## Contexto
Durante la replicacion de `HadiCakes` desde Stitch se identifico un flujo reusable: export HTML, localizacion de assets y validacion estatica.
El usuario aprobo convertir esa mejora en un skill formal para acelerar futuras iteraciones similares.

## Alcance
### In Scope
- Crear skill nuevo en `.codex/skills/` para replicacion Stitch -> sitio estatico local.
- Documentar workflow, guardrails y comandos de validacion.
- Sincronizar `.codex/skill-registry.md`.
- Cerrar trazabilidad con plan/index/handoff.

### Out of Scope
- Cambios en runtime de negocio (`src/`).
- Automatizar despliegues live.
- Modificar skills no relacionadas.

## Approach
| # | Paso | Estado | Notas |
|---|---|---|---|
| 1 | Definir nombre/alcance del skill y crear `SKILL.md` | Completed | Skill `stitch-site-replication` creado en `.codex/skills/` |
| 2 | Sincronizar skill registry deterministico | Completed | `npm run codex:skill-registry` ejecutado exitosamente |
| 3 | Actualizar artefactos de colaboracion de cierre | Completed | Plan/index/handoff sincronizados |

## Decisions & Trade-offs
| Decision | Rationale | Date |
|---|---|---|
| Crear skill operativo (sin scripts extra) en v1 | Menor complejidad inicial y alta reutilizacion inmediata | 2026-03-25 |

## Validation
- Verificaciones previstas:
  - `test -f .codex/skills/stitch-site-replication/SKILL.md`
  - `rg -n "^name: stitch-site-replication$|^description:" .codex/skills/stitch-site-replication/SKILL.md`
  - `npm run codex:skill-registry`
  - `rg -n "stitch-site-replication" .codex/skill-registry.md`
  - `for f in $(find .codex/skills -mindepth 2 -maxdepth 2 -type f -name 'SKILL.md'); do sed -n 's/^name:[[:space:]]*//p' "$f"; done | sort | uniq -d`
- Criterio de aceptacion:
  - Skill presente con frontmatter valido y workflow claro.
  - Registro sincronizado e incluye skill nuevo una sola vez.

## Outcome
Se agrego el skill reusable `stitch-site-replication` y se sincronizo `.codex/skill-registry.md` en el mismo flujo.
El repositorio queda listo para reutilizar el proceso Stitch -> sitio estatico local en futuras sesiones sin repetir discovery manual.

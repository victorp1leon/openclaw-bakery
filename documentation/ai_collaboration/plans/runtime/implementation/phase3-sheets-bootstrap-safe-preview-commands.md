# Phase 3 - sheets bootstrap safe preview commands

> **Type:** `Implementation`
> **Status:** `Complete`
> **Created:** `2026-03-13`
> **Last Updated:** `2026-03-13`

## Cross-References
| Documento | Ruta | Uso |
|---|---|---|
| Scripts NPM | `package.json` | Comandos `sheets:pricing:preview` y `sheets:recipes:preview` |
| Docs operativas | `documentation/operations/config-matrix.md` | Runbook de bootstrap y advertencias de seguridad |
| README | `README.md` | Onboarding rapido de comandos seguros |

## Contexto
Los comandos `sheets:*:init` pueden heredar flags `*_APPLY` y `*_OVERWRITE` del `.env`, lo que puede derivar en escritura live accidental durante validaciones. Se agregaron comandos de preview seguro que fuerzan `APPLY=0` y `OVERWRITE=0`.

## Alcance
### In Scope
- Agregar scripts npm de preview seguro para pricing y recipes.
- Actualizar README y matriz de configuracion con el flujo recomendado.
- Mantener artefactos de plan/index/handoff al dia.

### Out of Scope
- Cambios en scripts TypeScript de bootstrap.
- Cambios en logica de negocio de `shopping.list.generate`.
- Ejecucion de `apply` live como parte de esta tarea.

## Approach
| # | Paso | Estado | Notas |
|---|---|---|---|
| 1 | Agregar comandos `sheets:*:preview` | Completed | Fuerzan `APPLY=0` y `OVERWRITE=0` |
| 2 | Actualizar docs operativas | Completed | README + config matrix reflejan comando recomendado |
| 3 | Validar comandos nuevos | Completed | Ambos comandos ejecutados en modo preview |
| 4 | Cerrar artefactos de colaboracion | Completed | Plan + index + handoff actualizados |

## Decisions & Trade-offs
| Decision | Rationale | Date |
|---|---|---|
| Mantener `sheets:*:init` sin cambios | Preserva compatibilidad con flujos existentes | 2026-03-13 |
| Introducir `sheets:*:preview` como comando recomendado | Reduce riesgo operativo sin romper comandos actuales | 2026-03-13 |

## Validation
- `npm run sheets:pricing:preview`
- `npm run sheets:recipes:preview`
- Criterio de aceptacion: ambos comandos reportan `mode: "preview"` y no aplican escritura live.

## Outcome
Se agregaron comandos seguros para bootstrap de catalogos Sheets y se documento su uso recomendado para evitar escrituras accidentales cuando `.env` contiene flags de apply.

# Phase 4 - Web Publish Netlify Runbook

> **Type:** `Implementation`
> **Status:** `Complete`
> **Created:** `2026-03-05`
> **Last Updated:** `2026-03-05`

## Cross-References
| Documento | Ruta | Uso |
|---|---|---|
| Config matrix | `documentation/operations/config-matrix.md` | Variables/comandos de publicacion |
| Runbooks index | `documentation/operations/runbooks/README.md` | Descubrimiento de runbooks canonicos |
| Netlify runbook | `documentation/operations/runbooks/web-publish-netlify.md` | Procedimiento operativo de deploy/rollback |
| DDD matrix | `documentation/ai_implementation/ddd-roadmap-coverage-matrix.md` | Tracking de cierre de pendiente operativo |

## Contexto
Tras validar `web.publish` en Netlify, faltaba dejar un procedimiento operativo explicito para ejecucion diaria y recuperacion ante incidentes. Se documenta un runbook corto y accionable sin cambiar codigo de runtime.

## Alcance
### In Scope
- Crear runbook operativo de `web.publish` en Netlify.
- Incluir deploy estandar, checklist de verificacion y rollback.
- Actualizar indices y referencias operativas.

### Out of Scope
- Cambios de arquitectura o de contratos del adapter.
- Nuevas automatizaciones CI/CD.

## Approach
| # | Paso | Estado | Notas |
|---|---|---|---|
| 1 | Redactar runbook de `web.publish` Netlify | Completed | Deploy, verificacion, rollback, troubleshooting |
| 2 | Actualizar indices de operaciones | Completed | `operations/README` + `runbooks/README` |
| 3 | Referenciar runbook desde matriz operativa y DDD | Completed | `config-matrix` + `ddd-roadmap-coverage-matrix` |
| 4 | Cerrar tracking en artefactos AI collaboration | Completed | Plan + handoff + index |

## Decisions & Trade-offs
| Decision | Rationale | Date |
|---|---|---|
| Mantener runbook pragmatico (pasos cortos, comandos directos) | Reduce friccion operativa en incidentes reales | 2026-03-05 |
| Priorizar rollback por Netlify Deploy History | Minimiza tiempo de recuperacion sin tocar repo | 2026-03-05 |

## Validation
- Validacion documental:
  - Runbook creado y enlazado en indices de operaciones.
  - Referencia agregada en `config-matrix`.
- Validacion operativa:
  - Simulacro real de rollback via Netlify API ejecutado (rollback + roll-forward).
  - Tiempos medidos: `~894 ms` rollback y `~913 ms` roll-forward.
  - Sitio restaurado al deploy mas reciente al finalizar el simulacro.
  - Evidencia registrada en `documentation/operations/runbooks/web-publish-netlify.md`.

## Outcome
Se agrego runbook oficial para `web.publish` en Netlify:
- `documentation/operations/runbooks/web-publish-netlify.md`.
- Indices y matrices actualizadas para uso operativo y continuidad entre sesiones.
- Pendiente DDD actualizado de simulacro puntual a rutina periodica (mensual).

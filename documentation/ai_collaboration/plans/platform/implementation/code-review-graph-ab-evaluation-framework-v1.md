# Code Review Graph A/B Evaluation Framework v1

> **Type:** `Implementation`
> **Status:** `Complete`
> **Created:** `2026-03-24`
> **Last Updated:** `2026-03-24`

## Cross-References
| Documento | Ruta | Uso |
|---|---|---|
| Flujo canonico | `documentation/ai_collaboration/spec-driven-flow-v1.md` | Integrar evaluacion A/B en ciclo Discover/Validate |
| Gate CRG operativo | `documentation/ai_collaboration/references/operations/code-review-graph-gate-checklist.md` | Reglas de uso de CRG por etapa |
| Template de evaluacion | `documentation/ai_collaboration/references/operations/code-review-graph-ab-evaluation-template.md` | Medicion de 5 tareas/PRs |
| Reportes A/B | `reports/crg-ab/README.md` | Ubicacion de artifacts latest/history |

## Contexto
Se requirio pasar de una comparacion puntual a un mecanismo repetible para medir valor real de CRG frente a heuristica manual. Esta entrega crea un runner A/B ejecutable y un template operacional para acumular evidencia en 5 tareas.

## Alcance
### In Scope
- Script A/B ejecutable (`sin CRG` vs `con CRG`) con salida markdown/json.
- Comando npm para ejecucion rapida en cualquier archivo objetivo.
- Carpeta de reportes canonica (`reports/crg-ab`) con latest/history.
- Template de evaluacion de 5 tareas para seguimiento de impacto real.

### Out of Scope
- Automatizacion CI obligatoria del benchmark A/B.
- Cambios en runtime productivo CRG.
- Cambios de criterios de seguridad del adapter CRG.

## Approach
| # | Paso | Estado | Notas |
|---|---|---|---|
| 1 | Implementar runner A/B reutilizable en `scripts/tests` | Complete | `generate-crg-ab-summary.ts` |
| 2 | Exponer comando npm para ejecucion estandar | Complete | `test:crg-ab:summary` |
| 3 | Definir estructura de artifacts de reporte | Complete | `reports/crg-ab/latest-summary.*` + `history/` |
| 4 | Crear template de evaluacion de 5 tareas | Complete | `code-review-graph-ab-evaluation-template.md` |
| 5 | Ejecutar corrida inicial y validar salida | Complete | Resultado: heuristica 19 refs vs CRG 3 impactados, overlap 1 |
| 6 | Cerrar trazabilidad en docs/plan/handoff | Complete | Plan + index + handoff sincronizados |

## Decisions & Trade-offs
| Decision | Rationale | Date |
|---|---|---|
| Benchmark A/B en script local, no CI | Minimiza friccion inicial y permite adopcion gradual | 2026-03-24 |
| Heuristica baseline simple (refs + imports) | Representa flujo manual comun sin CRG | 2026-03-24 |
| Salida markdown + json | Sirve para lectura humana y comparacion automatizable futura | 2026-03-24 |

## Validation
- Comandos:
  - `npm run test:crg-ab:summary`
  - `sed -n '1,260p' reports/crg-ab/latest-summary.md`
- Resultado principal (corrida inicial):
  - Heuristic refs: `19`
  - CRG impacted files: `3`
  - Overlap: `1`
  - `trace_ref`: `code-review-graph:3495eea0-b8bb-4de9-9d76-cbd3f508493c`

## Outcome
Queda listo un framework A/B práctico para medir impacto real de CRG en futuras tareas. La comparacion puede correrse por archivo objetivo y registrarse de forma estandar para decidir ROI operativo.

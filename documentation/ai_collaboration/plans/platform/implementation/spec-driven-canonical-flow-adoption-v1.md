# Spec-Driven Canonical Flow Adoption v1

> **Type:** `Implementation`
> **Status:** `Complete`
> **Created:** `2026-03-17`
> **Last Updated:** `2026-03-17`

## Cross-References
| Documento | Ruta | Uso |
|---|---|---|
| Collaboration playbook | `documentation/ai_collaboration/codex-collaboration-playbook.md` | Flujo operativo actual |
| AI collaboration hub | `documentation/ai_collaboration/README.md` | Navegacion del dominio |
| AGENTS policy | `AGENTS.md` | Guardrails de aprobacion y continuidad |
| Spec-driven reference | `https://github.com/github/spec-kit` | Inspiracion metodologica |

## Contexto
Se necesita una ruta canonica unica para colaboracion Developer + Codex. El flujo actual funciona pero esta distribuido; se busca unificarlo en una secuencia clara de fases con adopcion gradual.

## Alcance
### In Scope
- Definir flujo canonico v1 en un documento dedicado.
- Alinear playbook/README del dominio con referencia al flujo v1.
- Registrar plan/index/handoff de esta decision.

### Out of Scope
- Automatizar comandos estilo spec-kit en este ciclo.
- Cambiar guardrails de aprobacion en `AGENTS.md`.
- Modificar runtime/tools del producto.

## Approach
| # | Paso | Estado | Notas |
|---|---|---|---|
| 1 | Definir flujo canonico v1 adaptado al repo | Complete | `spec-driven-flow-v1.md` |
| 2 | Alinear playbook y README del dominio | Complete | Referencia y ruta de evolucion |
| 3 | Cerrar artefactos de colaboracion | Complete | Plan/index/handoff |

## Decisions & Trade-offs
| Decision | Rationale | Date |
|---|---|---|
| Mantener flujo actual durante transicion | Evita friccion en entregas mientras se adopta v1 por fases | 2026-03-17 |
| Separar flujo v1 en doc dedicado | Facilita versionado y ajuste incremental sin romper playbook activo | 2026-03-17 |

## Validation
- Verificaciones ejecutadas:
  - revision de coherencia entre `spec-driven-flow-v1.md`, playbook y README del dominio.
  - `git diff --stat` para confirmar alcance documental.
- Criterio de aceptacion:
  - Existe flujo canonico unico documentado.
  - Playbook actual referencia explicitamente el camino de adopcion.

## Outcome
Quedo definido el flujo canonico v1 para adopcion a largo plazo y alineada la documentacion de colaboracion para iniciar piloto controlado sin interrumpir el proceso actual.

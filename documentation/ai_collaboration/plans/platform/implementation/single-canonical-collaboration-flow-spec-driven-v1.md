# Single Canonical Collaboration Flow (Spec-Driven) v1

> **Type:** `Implementation`
> **Status:** `Complete`
> **Created:** `2026-03-23`
> **Last Updated:** `2026-03-23`

## Cross-References
| Documento | Ruta | Uso |
|---|---|---|
| Guardrails operativos | `AGENTS.md` | Gates de aprobacion y workflow minimo obligatorio |
| Flujo canonico unico | `documentation/ai_collaboration/spec-driven-flow-v1.md` | Fuente de verdad consolidada |
| Mapa del sistema | `documentation/ai_collaboration/system-map.md` | Contexto transversal de arquitectura |
| Indice de planes | `documentation/ai_collaboration/plans/_index.md` | Trazabilidad de estado del trabajo |

## Contexto
Se detecto ambiguedad operativa al coexistir dos documentos de flujo (`spec-driven-flow-v1.md` y `codex-collaboration-playbook.md`). El objetivo fue consolidar un solo flujo oficial para reducir friccion de onboarding y decisiones inconsistentes entre sesiones.

## Alcance
### In Scope
- Declarar `spec-driven-flow-v1.md` como unica fuente activa de flujo.
- Integrar en `spec-driven-flow-v1.md` los elementos operativos utiles del playbook previo.
- Actualizar referencias activas para apuntar al flujo canonico unico.
- Eliminar archivos legacy de playbook que ya no son necesarios para la operacion diaria.

### Out of Scope
- Cambios en runtime, tools o integraciones externas.
- Reescritura de decisiones historicas de planes/handoffs.
- Automatizacion CI adicional por este cambio documental.

## Approach
| # | Paso | Estado | Notas |
|---|---|---|---|
| 1 | Activar flujo canonico unico en `spec-driven-flow-v1.md` | Complete | `Status` actualizado a `Active` + secciones operativas integradas |
| 2 | Actualizar referencias activas al flujo canonico | Complete | `AGENTS.md`, `README.md`, `documentation/ai_collaboration/README.md` |
| 3 | Eliminar archivos legacy de playbook no necesarios | Complete | Eliminados `documentation/ai_collaboration/codex-collaboration-playbook.md` y `AI Collaboration Playbook.md` |
| 4 | Cerrar artefactos de colaboracion | Complete | Plan/index/handoff sincronizados |

## Decisions & Trade-offs
| Decision | Rationale | Date |
|---|---|---|
| Mantener un solo flujo activo | Evita ambiguedad operativa y reduce carga cognitiva | 2026-03-23 |
| Integrar contenido util del playbook en el flujo canonico | Conserva valor operativo sin duplicar documentos | 2026-03-23 |
| Actualizar referencias legacy existentes a la ruta canonica | Minimiza enlaces rotos y simplifica navegacion | 2026-03-23 |

## Validation
- Verificaciones ejecutadas:
  - `rg -n "Status: Active|Source of Truth Precedence|Integrated Operational Guidance" documentation/ai_collaboration/spec-driven-flow-v1.md`
  - `rg -n "spec-driven-flow-v1.md" AGENTS.md README.md documentation/ai_collaboration/README.md`
  - `rg -n "codex-collaboration-playbook\\.md|AI Collaboration Playbook\\.md" -S .`
- Criterio de aceptacion:
  - Un solo flujo operativo documentado y referenciado como canonico.
  - Sin archivos de playbook legacy activos.

## Outcome
Se consolido un flujo unico de colaboracion en `documentation/ai_collaboration/spec-driven-flow-v1.md`, integrando contenido operativo util y eliminando duplicidad de playbooks.

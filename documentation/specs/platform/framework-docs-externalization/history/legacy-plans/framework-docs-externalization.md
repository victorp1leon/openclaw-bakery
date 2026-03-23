# Framework Docs Externalization (Non-Disruptive)

> **Type:** `Implementation`
> **Status:** `Complete`
> **Created:** `2026-03-03`
> **Last Updated:** `2026-03-03`

## Cross-References
| Documento | Ruta | Uso |
|---|---|---|
| Docs IA | `documentation/documentation-information-architecture.md` | Modelo de ubicacion por dominio |
| Docs hub | `documentation/README.md` | Navegacion principal |
| Plan previo IA | `documentation/ai_collaboration/plans/platform/implementation/documentation-ia-industry-alignment.md` | Base de estructura |

## Contexto
Algunos documentos eran de tipo framework/metodologia reusable y no canon de producto. Para reducir ruido en el dominio principal de docs, se externalizaron internamente a referencias, manteniendo compatibilidad por rutas legacy.

## Alcance
### In Scope
- Externalizar internamente (preparado para repo externo) estos docs:
  - `documentation/documentation-driven-development.md`
  - `documentation/ai-first-project-developed-structure.md`
  - `documentation/ai-first-project-developed.md`
- Crear stubs de compatibilidad en las rutas originales.
- Actualizar hubs/IA para reflejar ubicacion canonica nueva.

### Out of Scope
- Crear o publicar un repo externo en esta sesion.
- Reescribir en profundidad el contenido de framework.

## Approach
| # | Paso | Estado | Notas |
|---|---|---|---|
| 1 | Crear plan y activarlo en indice | Completed | Plan activo registrado |
| 2 | Mover docs a referencias y dejar stubs | Completed | Sin ruptura de rutas legacy |
| 3 | Actualizar README/IA y referencias clave | Completed | Canon actualizado a `ai_collaboration/references/framework/` |
| 4 | Cerrar plan + handoff | Completed | Artefactos de cierre creados |

## Decisions & Trade-offs
| Decision | Rationale | Date |
|---|---|---|
| Externalizacion no disruptiva con stubs | Mantener compatibilidad mientras se limpia el canon | 2026-03-03 |
| Ubicar temporalmente en `ai_collaboration/references` | Refleja naturaleza reusable y facilita migracion futura | 2026-03-03 |

## Validation
- Se verifico existencia de rutas canonicas en `documentation/ai_collaboration/references/framework/`.
- Se verifico presencia de stubs en rutas legacy.
- Se verifico actualizacion de referencias en hubs clave.

## Outcome
- Canon framework movido a:
  - `documentation/ai_collaboration/references/framework/documentation-driven-development.md`
  - `documentation/ai_collaboration/references/framework/ai-first-project-developed-structure.md`
  - `documentation/ai_collaboration/references/framework/ai-first-project-developed.md`
- Rutas legacy mantenidas como redirect stubs.
- Hubs actualizados para distinguir `product canon` vs `framework reusable`.

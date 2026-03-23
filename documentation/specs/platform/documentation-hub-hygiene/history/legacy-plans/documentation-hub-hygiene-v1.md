# Documentation Hub Hygiene v1

> **Type:** `Implementation`
> **Status:** `Complete`
> **Created:** `2026-03-17`
> **Last Updated:** `2026-03-17`

## Cross-References
| Documento | Ruta | Uso |
|---|---|---|
| Documentation hub | `documentation/README.md` | Punto de entrada principal |
| IA documental | `documentation/documentation-information-architecture.md` | Politica de organizacion y stubs |
| Implementation instructions | `documentation/ai_implementation/implementation-instructions.md` | Guia spec-first operativa |
| C4 templates | `documentation/c4/templates/*` | Normalizacion de plantillas activas/legacy |

## Contexto
Se detectaron hubs con metadatos desfasados, varios stubs sin estado explicito y una plantilla C4 legacy mezclada con templates canonicos. Esto hacia mas dificil distinguir contenido operativo vs scaffold.

## Alcance
### In Scope
- Actualizar hubs documentales principales y metadatos.
- Marcar stubs con estado `Scaffold` y contenido esperado.
- Archivar plantilla C4 legacy con pointer en ruta original.
- Registrar plan/index/handoff de la limpieza.

### Out of Scope
- Reescritura profunda de docs tecnicas de dominio.
- Automatizacion CI de calidad documental.
- Cambios de runtime/tools.

## Approach
| # | Paso | Estado | Notas |
|---|---|---|---|
| 1 | Actualizar hubs y guia de implementacion | Complete | Fechas/estado y secciones de madurez actualizadas |
| 2 | Normalizar stubs con estado explicito | Complete | API/AI-evals/model-cards/safety/release-notes |
| 3 | Archivar template legacy C4 | Complete | Movido a `templates/archive/` + pointer compatible |
| 4 | Cerrar artefactos de colaboracion | Complete | Plan, index y handoff |

## Decisions & Trade-offs
| Decision | Rationale | Date |
|---|---|---|
| Mantener pointer en ruta legacy en vez de borrar archivo | Evita romper referencias historicas y facilita migracion gradual | 2026-03-17 |
| Usar estado `Scaffold` para stubs | Hace explicito que son placeholders intencionales y no docs completas | 2026-03-17 |

## Validation
- Verificaciones ejecutadas:
  - lectura directa de archivos actualizados
  - verificacion de presencia de archivo archivado y pointer legacy
  - `git status --short` para confirmar alcance de cambios
- Criterio de aceptacion:
  - Hubs y stubs quedan claramente diferenciados por estado/madurez.
  - Template legacy queda fuera de ruta canonica y con referencia estable.

## Outcome
La carpeta `documentation/` queda mejor señalizada para navegacion: hubs actualizados, placeholders explicitos y plantillas legacy separadas de la ruta activa.

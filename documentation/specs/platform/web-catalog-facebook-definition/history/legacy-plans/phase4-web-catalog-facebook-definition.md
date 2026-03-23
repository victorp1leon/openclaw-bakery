# Phase 4 - Web Catalog + Facebook Media Definition

> **Type:** `Implementation`
> **Status:** `Complete`
> **Created:** `2026-03-04`
> **Last Updated:** `2026-03-04`

## Cross-References
| Documento | Ruta | Uso |
|---|---|---|
| Roadmap | `documentation/bot-bakery.roadmap.md` | Alcance funcional web MVP |
| Tool spec | `documentation/c4/ComponentSpecs/Tools/Specs/publish-site.spec.md` | Contrato del adapter `web.publish` |
| DDD matrix | `documentation/ai_implementation/ddd-roadmap-coverage-matrix.md` | Tracking de cobertura/diseno |

## Contexto
El alcance web MVP ya contemplaba menu/galeria, pero faltaba cerrar definicion de catalogo visual y politica de origen de imagenes.
Se requiere una definicion explicita y auditable para usar imagenes desde pagina de Facebook del negocio sin comprometer seguridad.

## Alcance
### In Scope
- Definir catalogo visual como parte del sitio MVP.
- Definir politica de fuente de imagenes (`facebook` + fallback manual).
- Ajustar spec `publish-site` con reglas de validacion y seguridad.
- Reflejar cambios en roadmap y matriz DDD.

### Out of Scope
- Implementacion runtime/adapters en `src/tools/web/publishSite.ts`.
- Integracion live con APIs de Meta/Facebook.
- Tests de adapter para `web.publish`.

## Approach
| # | Paso | Estado | Notas |
|---|---|---|---|
| 1 | Revisar definicion actual de Fase 4 | Completed | Baseline: scope general, sin detalle de catalogo |
| 2 | Definir catalogo + politica Facebook/fallback en specs | Completed | Contrato actualizado en `publish-site.spec.md` |
| 3 | Sincronizar roadmap + DDD | Completed | Trazabilidad documentada |

## Decisions & Trade-offs
| Decision | Rationale | Date |
|---|---|---|
| Catalogo visual se incluye en MVP (`catalogItems`) | Alinea el sitio con objetivo comercial real del negocio | 2026-03-04 |
| Fuente primaria de imagenes: pagina de Facebook del negocio | Minimiza carga operativa y reutiliza activos existentes | 2026-03-04 |
| Fallback manual obligatorio | Reduce bloqueo por fallas de extraccion/permisos externos | 2026-03-04 |
| Restringir imagenes a `https` + dominios aprobados + scope de pagina | Seguridad y control de contenido publicado | 2026-03-04 |

## Validation
- Validacion documental: coherencia entre roadmap, spec y matriz DDD.
- Criterio de aceptacion:
  - Roadmap web MVP incluye catalogo visual y flujo de imagenes.
  - `publish-site.spec.md` define content profile con `catalogItems` e `imageSource`.
  - Reglas de seguridad para origen de imagenes quedan explicitas.

## Outcome
La Fase 4 queda mejor definida para implementar `web.publish` con catalogo visual e imagenes del Facebook del negocio de forma segura, con fallback manual y reglas claras de validacion.

# Session Handoff: Phase 4 Web Catalog + Facebook Media Definition - 2026-03-04

> **Plan:** `documentation/ai_collaboration/plans/platform/implementation/phase4-web-catalog-facebook-definition.md`
> **Date:** `2026-03-04`
> **Owner:** `Codex + Dev`

## What Was Done
- Se definio el catalogo visual como parte explicita del alcance MVP del sitio web.
- Se actualizo `publish-site.spec.md` con `catalogItems`, `imageSource` y reglas de validacion por accion (`crear/menu/publicar`).
- Se agregaron restricciones de seguridad para imagenes (scope Facebook del negocio, `https`, dominios aprobados, sanitizacion de URL).
- Se actualizaron roadmap y matriz DDD para reflejar la definicion de catalogo + Facebook/fallback manual.

## Current State
- Diseno/documentacion de Fase 4 mas concreta y lista para implementacion tecnica.
- `web.publish` sigue sin implementacion real en runtime (`src/tools/web/publishSite.ts` stub).

## Open Issues
- Falta decision operativa final sobre proveedor de deploy y variables `WEB_*`.
- Falta definir mecanismo tecnico exacto de ingesta Facebook (Graph API vs flujo manual asistido).

## Next Steps
1. Implementar adapter real `publishSiteTool` con validacion de `catalogItems` e imagenes segun spec.
2. Agregar pruebas de adapter (`retries`, `auth missing`, `reject non-https`, `facebook source without scope`).
3. Crear smoke command `web.publish` en entorno controlado.
4. Actualizar `config-matrix.md` y `healthcheck` con readiness de publish connector.

## Key Decisions
- El sitio MVP incluye catalogo visual de productos.
- La fuente primaria de imagenes sera Facebook del negocio, con fallback manual obligatorio.
- Seguridad primero: no usar media privada/personal y limitar fuentes de URL.

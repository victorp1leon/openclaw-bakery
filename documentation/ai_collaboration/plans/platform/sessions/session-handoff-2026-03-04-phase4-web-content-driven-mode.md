# Session Handoff: Phase 4 Web Content-Driven Mode - 2026-03-04

> **Plan:** `documentation/ai_collaboration/plans/platform/implementation/phase4-web-content-driven-mode.md`
> **Date:** `2026-03-04`
> **Owner:** `Codex + Dev`

## What Was Done
- Se deshabilito por default el modo web por chat via `WEB_CHAT_ENABLE=0`.
- Se mantuvo el flujo conversacional web detras de feature flag para uso futuro (`WEB_CHAT_ENABLE=1`).
- Se agrego modo content-driven por terminal/CI:
  - script `scripts/web/publish-site-from-content.ts`
  - comando `npm run web:publish`
  - contenido canonico inicial `site/CONTENT.json`
- Se extendio config/health con:
  - `WEB_CHAT_ENABLE`
  - `WEB_CONTENT_PATH`
  - check `web_chat_mode` en healthcheck
- Se actualizaron tests y documentación operativa/roadmap/DDD.

## Current State
- Operación recomendada: publicar sitio desde contenido versionado en repo (terminal/CI).
- `web` por chat queda apagado por defecto y no ejecuta cambios.

## Open Issues
- Falta validacion live controlada con endpoint real de publish (`WEB_PUBLISH_DRY_RUN=0`).

## Next Steps
1. Definir endpoint real y correr `WEB_PUBLISH_DRY_RUN=0 npm run web:publish`.
2. Agregar runbook corto de publish/rollback para operación.
3. (Opcional) Rehabilitar chat web solo en entornos controlados (`WEB_CHAT_ENABLE=1`).

## Key Decisions
- Seguridad primero: no operar web desde chat en modo default.
- Content-driven publish como ruta canonica para reducir riesgo y complejidad.

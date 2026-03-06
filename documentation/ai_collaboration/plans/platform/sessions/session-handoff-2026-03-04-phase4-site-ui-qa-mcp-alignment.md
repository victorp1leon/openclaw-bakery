# Session Handoff: Phase 4 Site UI QA MCP Alignment - 2026-03-04

> **Plan:** `documentation/ai_collaboration/plans/platform/implementation/phase4-site-ui-qa-mcp-alignment.md`
> **Date:** `2026-03-04`
> **Owner:** `Codex + Dev`

## What Was Done
- Se agrego `scripts/smoke/web-ui-playwright-smoke.ts` para validar UX critica del sitio (`site/dist`) en desktop/mobile.
- Se agrego comando `npm run smoke:web:ui` (ejecuta `web:build` y luego smoke UI).
- Se documento workflow `Figma MCP + Playwright MCP` en `documentation/operations/site-design-qa-workflow.md`.
- Se actualizaron docs operativas (`config-matrix`, `operations/README`) y roadmap para reflejar cobertura UI smoke.

## Current State
- El flujo content-driven del sitio se mantiene igual (`site/CONTENT.json` -> `web:build` -> `site/dist`).
- Ahora existe validacion automatizada de CTA WhatsApp, personalizados, tabs de catalogo, mapa y overflow mobile.
- El smoke UI requiere navegador Chromium disponible localmente o ruta explicita por env var.

## Open Issues
- En este entorno no se pudo descargar Chromium de Playwright por bloqueo de red (`EAI_AGAIN cdn.playwright.dev`).
- Falta correr el smoke UI completo con browser instalado para evidencia final de viewport real.

## Next Steps
1. En un entorno con internet, instalar Chromium de Playwright y ejecutar `npm run smoke:web:ui`.
2. Activar `WEB_UI_SMOKE_SCREENSHOTS=1` para adjuntar evidencia visual en revisiones.
3. Usar el workflow MCP documentado para iterar contra referencias visuales externas.

## Key Decisions
- Se priorizo smoke UI de bajo acoplamiento con `playwright-core` para no migrar el stack frontend.
- Se incluyo fallback `WEB_UI_SMOKE_SKIP_BROWSER=1` para no bloquear CI/local sin navegador.

# Site Design + QA Workflow (Figma MCP + Playwright MCP)

Status: MVP
Last Updated: 2026-03-04

## Purpose
Estandarizar un flujo rapido para iterar el sitio (`site/CONTENT.json` -> `site/dist`) usando:
- Figma MCP para alinear layout/tokens.
- Playwright MCP para validar responsive y CTAs reales.

## Scope
- Referencia visual externa para inspiracion/conversion (ejemplo: `https://www.sweetesbakeshop.com/`).
- Iteracion de contenido/estructura en el modo content-driven existente.
- Validacion de UX critica: WhatsApp CTA, personalizados, mobile breakpoints.

## Security-First Rules
- Pin de versiones para cualquier servidor MCP (sin `@latest`).
- Allowlist de servidores MCP aprobados por negocio.
- No exponer secretos en prompts, logs o capturas.
- No ejecutar publish live sin confirmacion explicita y credenciales de entorno.

## Figma MCP Flow
1. Captura o referencia el layout objetivo (home y mobile).
2. Lee en MCP:
   - Frames principales (hero, catalogo, personalizados, contacto).
   - Variables/tokens (tipografia, color, espaciado, radios).
   - Componentes repetibles (cards, CTAs, tabs).
3. Traduce a ajustes concretos:
   - Copy y estructura en `site/CONTENT.json`.
   - Ajustes de markup/estilos en `scripts/web/build-site-from-content.ts` (solo si hace falta).
4. Regenera sitio:
   - `npm run web:build`

## Playwright MCP Flow
1. Navega el sitio generado (`site/dist/index.html`) y recorre la pagina completa.
2. Ejecuta checklist en desktop y mobile:
   - CTA principal a `wa.me`.
   - CTA de `Ordenar` por card con texto prellenado.
   - Formulario/CTA de personalizados.
   - Boton sticky de WhatsApp visible.
   - Sin overflow horizontal en mobile.
3. Si pasa, registra evidencia (capturas) y deja hallazgos.

## Local Smoke Command (Playwright-Core)
El repo incluye un smoke UI para automatizar validaciones base:
- `npm run smoke:web:ui`

Variables utiles:
- `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`: ruta local a Chromium si no hay browser instalado por Playwright.
- `PLAYWRIGHT_BROWSERS_PATH`: ruta para cache local de browsers.
- `WEB_UI_SMOKE_HEADLESS`: `1` headless, `0` visible.
- `WEB_UI_SMOKE_SCREENSHOTS`: `1` guarda `desktop.png` y `mobile.png` en `site/dist/.smoke/`.
- `WEB_UI_SMOKE_SKIP_BROWSER`: `1` valida solo presencia de `site/dist` (fallback sin navegador).

Instalar browser en entorno con internet:
- `PLAYWRIGHT_BROWSERS_PATH=.playwright-browsers node node_modules/playwright-core/cli.js install chromium`

## Recommended Sequence Per Iteration
1. Figma MCP: extraer layout/tokens del objetivo.
2. Editar `site/CONTENT.json` (y builder si aplica).
3. `npm run web:build`
4. `npm run smoke:web:ui`
5. Si todo pasa: `npm run web:publish` (dry-run por default).

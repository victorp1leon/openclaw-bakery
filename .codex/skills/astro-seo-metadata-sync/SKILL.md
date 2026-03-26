---
name: astro-seo-metadata-sync
description: Keep Astro SEO metadata consistent across pages by removing hardcoded domains and wiring canonical/OG/Twitter URLs to shared base URL config (`baseUrlFromConfig`). Use when pages drift in canonical, og:url, og:image, or twitter:image values.
---

# astro-seo-metadata-sync

## Workflow
1. Detect drift fast.
- Run:
  - `rg -n "hadicakes\\.local|rel=\"canonical\"|og:url|og:image|twitter:image" site-new-astro/src/pages`
- Group findings by page.

2. Normalize page frontmatter.
- Ensure page imports:
  - `import { baseUrlFromConfig } from '../lib/site-content';`
- Ensure page declares:
  - `const baseUrl = baseUrlFromConfig();`

3. Standardize URL metadata.
- Canonical:
  - `<link rel="canonical" href={`${baseUrl}/<page>.html`} />`
- OG URL:
  - `<meta property="og:url" content={`${baseUrl}/<page>.html`} />`
- OG/Twitter image URL:
  - `<meta property="og:image" content={`${baseUrl}/assets/...`} />`
  - `<meta name="twitter:image" content={`${baseUrl}/assets/...`} />`

4. Preserve page intent.
- Keep existing SEO title/description copy unless user asks to rewrite messaging.
- Avoid touching non-head UI sections unless required.

5. Validate and re-scan.
- Run:
  - `npm run web:new:build`
  - `rg -n "hadicakes\\.local" site-new-astro/src/pages`
- Report residual hardcoded values in non-Astro files (for example `public/sitemap.xml`, `public/robots.txt`).

## Guardrails
- Do not hardcode production domains in pages.
- Prefer config-driven base URL through `baseUrlFromConfig`.
- Keep edits minimal and deterministic.
- Do not modify business logic, sync scripts, or content schema unless explicitly requested.

## Quick Commands
- Canonical/OG audit:
  - `rg -n "rel=\"canonical\"|og:url|og:image|twitter:image" site-new-astro/src/pages`
- Hardcoded domain audit:
  - `rg -n "hadicakes\\.local" site-new-astro/src/pages site-new-astro/public/robots.txt site-new-astro/public/sitemap.xml`
- Build validation:
  - `npm run web:new:build`

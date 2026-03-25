---
name: stitch-site-replication
description: Replicate the latest Stitch design into a local static site directory with robust local assets (images, fonts, vendor scripts), functional page links, and verification evidence. Use when the user asks to make a Stitch app design real in the repo.
---

# stitch-site-replication

## Workflow
1. Discover the latest Stitch project and screens first.
- List projects and match by title.
- Confirm recency using `updateTime`.
- List screens and capture `htmlCode.downloadUrl` per screen.

2. Export HTML screens to a temp folder before touching repo files.
- Keep source snapshots in `/tmp/<project>-stitch/`.
- Use deterministic filenames (`index`, `catalogo`, `contacto`, etc.).
- If network is blocked by sandbox, rerun `curl` with escalation.

3. Scaffold the target static folder without overwriting existing sites.
- Prefer a new folder such as `site-new/` unless user requests replacement.
- Copy exported HTML files and set `index.html`.
- Keep original source HTML as backup (`home.html`, `app-shell.html`) when useful.

4. Localize external assets for robustness.
- Rewrite remote image URLs to `assets/images/*`.
- Replace remote font CSS links with local `assets/vendor/fonts-*.css`.
- Download font binaries referenced by CSS into `assets/fonts/*` and rewrite CSS URLs to local relative paths.
- Store Tailwind runtime locally (`assets/vendor/tailwindcss-cdn.js`) when export depends on CDN runtime.
- Keep manifest files (`assets/*manifest.tsv`) for traceability.

5. Normalize navigation and external links.
- Replace `href="#"` placeholders with real internal routes where intent is clear.
- Keep social links explicit (`Instagram`, `WhatsApp`, `Facebook`) and consistent across pages.
- Preserve section anchors only when they are valid on the same page.

6. Validate and report evidence.
- No unresolved remote design dependencies in HTML:
  - `rg -n "https://lh3.googleusercontent.com/aida-public|https://fonts.googleapis.com|https://fonts.gstatic.com|cdn.tailwindcss.com" site-new/*.html`
- No dead placeholder links:
  - `rg -n "href=\"#\"" site-new/*.html`
- All local `assets/*` references exist (scripted check).
- Optional HTTP smoke with temporary local server (`200` for each page). If bind is blocked in sandbox, rerun with escalation.

## Guardrails
- Do not run publish/live deployment unless the user explicitly asks.
- Do not overwrite `site/` by default; create/modify only approved target directory.
- Do not commit tokens or Stitch bearer credentials.
- Keep changes deterministic: same input exports should produce stable file layout and manifests.

## Quick Commands
- Find unresolved remote refs:
  - `rg -n "https://lh3.googleusercontent.com/aida-public|https://fonts.googleapis.com|https://fonts.gstatic.com|cdn.tailwindcss.com|href=\"#\"" <target>/*.html`
- Count localized assets:
  - `echo "images: $(find <target>/assets/images -type f | wc -l)"; echo "fonts: $(find <target>/assets/fonts -type f | wc -l)"; echo "vendor: $(find <target>/assets/vendor -type f | wc -l)"`
- Verify all `assets/*` references exist:
  - `node -e "const fs=require('fs');const p=require('path');const r=process.argv[1];const h=fs.readdirSync(r).filter(f=>f.endsWith('.html'));let m=[];for(const f of h){const t=fs.readFileSync(p.join(r,f),'utf8');for(const x of t.matchAll(/(?:src|href)=\\\"(assets\\/[^\\\"]+)\\\"/g)){if(!fs.existsSync(p.join(r,x[1])))m.push(f+': '+x[1]);}for(const x of t.matchAll(/url\\('?(assets\\/[^'\\\")]+)'?\\)/g)){if(!fs.existsSync(p.join(r,x[1])))m.push(f+': '+x[1]);}}console.log('missing=',m.length);if(m.length)console.log(m.join('\\n'))" <target>`

# site-new-astro

Sitio oficial de HadiCakes en Astro con componentes reutilizables.

## Scripts locales (desde `site-new-astro/`)
- `npm run dev`
- `npm run build`
- `npm run preview`

## Scripts desde la raiz del repo
- `npm run web:new:build` (alias)
- `npm run web:new:live` (alias)
- `npm run web:new:astro:dev`
- `npm run web:new:astro:build`
- `npm run web:new:astro:preview`

## Estructura
- `src/layouts/BaseLayout.astro`
- `src/components/{Header,Footer,BottomNav}.astro`
- `src/pages/*.astro` (compilan a rutas `.html`)
- `src/styles/pages/*.css`
- `public/assets/*`

## Estado actual
- Build Astro funcional y validado.
- Rutas generadas como archivos `.html`.
- `site-new` legacy fue retirado tras cutover.

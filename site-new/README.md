# HadiCakes - `site-new`

Replica estatica del ultimo diseno de Stitch para `HadiCakes` (actualizacion 2026-03-25), con mejoras UX/SEO locales.

## Paginas
- `index.html`
- `home.html`
- `home-mobile.html`
- `catalogo.html`
- `producto-detalle.html`
- `pasteles-personalizados.html`
- `como-ordenar.html`
- `contacto-cobertura.html`
- `app-shell.html`

## SEO y discovery
- `sitemap.xml`
- `robots.txt`
- `assets/favicon.svg`

## Assets locales
- Imagenes: `assets/images/` (`32` archivos)
- Fuentes: `assets/fonts/` (`18` archivos)
- Vendor: `assets/vendor/` (`fonts-*.css` y `tailwindcss-cdn.js`)
- JS de mejoras: `assets/js/site-enhancements.js`
- Manifests: `assets/images-manifest.tsv`, `assets/fonts-css-manifest.tsv`, `assets/fonts-manifest.tsv`

## Mejoras pack2/pack3 aplicadas
- SEO basico por pagina: `description`, `canonical`, Open Graph y Twitter Card.
- Performance base: `loading`/`decoding` en imagenes + `fetchpriority=high` para imagen hero.
- Accesibilidad base: `skip-link`, `main#main-content`, `aria-current` en navegacion.
- UX: menu mobile funcional (JS) y filtros de catalogo funcionales por categoria.

## Ver local
```bash
python3 -m http.server 4174 --directory site-new
```
Abrir `http://127.0.0.1:4174/index.html`.

## Templates reutilizables
Los bloques compartidos ahora viven en:
- `site-new/_templates/partials/header.html`
- `site-new/_templates/partials/footer.html`
- `site-new/_templates/partials/bottom-nav.html`

Las paginas fuente viven en:
- `site-new/_templates/pages/*.html`

En esas paginas puedes incluir parciales con:
```html
<!-- @include header -->
```

## Build del sitio desde templates
Regenera `site-new/*.html` con:
```bash
npm run web:new:build
```

Build + servidor local:
```bash
npm run web:new:live
```

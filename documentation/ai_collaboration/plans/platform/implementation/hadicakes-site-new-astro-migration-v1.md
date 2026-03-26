# HadiCakes - Site New Astro Migration v1

> **Type:** `Implementation`
> **Status:** `In Progress`
> **Created:** `2026-03-26`
> **Last Updated:** `2026-03-26`

## Cross-References
| Documento | Ruta | Uso |
|---|---|---|
| Flujo canonico SDD | `documentation/ai_collaboration/spec-driven-flow-v1.md` | Marco de ejecucion |
| System map | `documentation/ai_collaboration/system-map.md` | Contexto transversal |
| Baseline actual `site-new` | `documentation/ai_collaboration/plans/platform/implementation/hadicakes-site-new-template-partials-v5.md` | Estado previo con templates HTML |
| Sitio objetivo | `site-new/` | Superficie a migrar |

## Contexto
Se aprobo migrar `site-new` a Astro para trabajar con componentes reales, estilos separados y layout reutilizable sin duplicar markup. El objetivo es conservar el diseno/UX actual, pero con arquitectura de frontend moderna y mantenible.

## Alcance
### In Scope
- Crear proyecto Astro para reemplazar `site-new`.
- Migrar las 9 pantallas actuales a rutas Astro equivalentes.
- Convertir shell compartido a componentes (`Header`, `Footer`, `BottomNav`, layout base).
- Separar estilos en archivos dedicados (`global` + secciones/componentes).
- Portar JS funcional existente (menu mobile, filtros catalogo, `aria-current`, schema).
- Mantener assets locales y enlaces funcionando.
- Definir build/preview local y documentar flujo operativo.

### Out of Scope
- Cambiar direccion visual del diseno Stitch.
- Replantear copy/contenido de negocio.
- Implementar backend o CMS.
- Rediseñar SEO avanzado fuera de la paridad existente.

## Approach
| # | Paso | Estado | Notas |
|---|---|---|---|
| 1 | Discovery tecnico y matriz de migracion | Completed | Inventario de paginas, assets y scripts compartidos ya establecido en `site-new` |
| 2 | Bootstrapping Astro en workspace | Completed | Proyecto paralelo `site-new-astro/` con `package.json`, `astro.config.mjs`, `tsconfig.json` + scripts raiz `web:new:astro:*` |
| 3 | Definir arquitectura base de componentes/layouts | Completed | `BaseLayout.astro`, `Header.astro`, `Footer.astro`, `BottomNav.astro` |
| 4 | Migrar estilos a hojas separadas | Completed | `src/styles/pages/*.css` generados por pagina + `src/styles/global.css` base |
| 5 | Migrar rutas pagina por pagina | Completed | 9 rutas migradas a `src/pages/*.html.astro` |
| 6 | Migrar y validar interactividad client-side | Completed | `site-enhancements.js` copiado a `public/assets/js` y cargado desde layout |
| 7 | Validacion funcional + visual de paridad | In Progress | Build Astro exitoso + smoke HTTP/enlaces en `200`; falta smoke visual manual en navegador |
| 8 | Cutover operativo de `site-new` | Pending | Definir estrategia final: output Astro en `site-new/` o reemplazo completo de estructura |
| 9 | Cierre documental + handoff final | Pending | Plan/index/handoff y comandos finales de operacion |

## Step-by-Step Detallado
1. Congelar baseline actual:
- Capturar inventario de rutas y componentes compartidos existentes.
- Confirmar scripts JS activos y metadatos SEO por pagina.

2. Inicializar Astro:
- Crear carpeta de migracion (propuesta: `site-new-astro/` durante transicion).
- Configurar scripts npm para `astro dev`, `astro build`, `astro preview`.

3. Crear layout y componentes:
- `src/layouts/BaseLayout.astro` con head comun y slots.
- `src/components/Header.astro`, `Footer.astro`, `BottomNav.astro`.
- Definir API minima de componentes (props de estado activo/ruta).

4. Externalizar estilos:
- Mover estilos repetidos a `src/styles/global.css`.
- Crear archivos CSS por seccion/pagina cuando sea necesario.
- Evitar reglas globales que contaminen el header/footer.

5. Migrar paginas:
- Traducir cada HTML a `src/pages/*.astro`.
- Reemplazar bloques repetidos por componentes.
- Preservar clases/tokens para paridad visual.

6. Portar JS funcional:
- Integrar `site-enhancements.js` en Astro (layout o paginas que lo requieran).
- Verificar menu mobile, filtros y `aria-current`.

7. Validar:
- Ejecutar build y preview local.
- Smoke de navegacion entre rutas.
- Revisar comportamiento responsive desktop/mobile.
- Comprobar SEO basico (`title`, meta description, canonical, OG/Twitter).

8. Cutover:
- Elegir estrategia final de despliegue local (recomendado: salida construida reemplaza `site-new` o se documenta nuevo target oficial).
- Actualizar README operativo del sitio.

9. Cierre:
- Completar estado del plan.
- Actualizar `_index.md`.
- Crear handoff de cierre con pendientes residuales (si aplica).

## Decisions & Trade-offs
| Decision | Rationale | Date |
|---|---|---|
| Migracion en fases con paridad primero | Reduce riesgo de regresion visual/funcional | 2026-03-26 |
| Mantener assets locales existentes | Evita dependencias externas y acelera migracion | 2026-03-26 |
| Definir cutover explicito al final | Permite validar en paralelo sin romper `site-new` productivo local | 2026-03-26 |

## Validation
- Build/preview tecnico ejecutado:
  - `npm install` (en `site-new-astro/`) -> completado.
  - `ASTRO_TELEMETRY_DISABLED=1 npm run build` -> completado con salida `dist/`.
  - `npm run web:new:astro:build` (desde raiz) -> completado.
- Ajuste de routing aplicado:
  - Renombre de paginas `*.html.astro` -> `*.astro`.
  - `astro.config.mjs` con `build.format='file'` para generar rutas `*.html` reales.
- Checks estructurales ejecutados:
  - `find site-new-astro/src -maxdepth 3 -type f | sort` -> componentes/layout/pages/styles presentes.
  - `find site-new-astro/dist -maxdepth 3 -type f | sort` -> rutas estaticas y assets generados.
- Smoke HTTP ejecutado (servidor local + curl):
  - 9 rutas principales `*.html` -> `200`.
  - assets clave (`site-enhancements.js`, imagen, vendor js/css), `robots.txt`, `sitemap.xml` -> `200`.
  - chequeo automatico de referencias locales (`href/src`) -> `broken_refs 0`.
- Pendiente de validacion manual:
  - smoke visual/responsive en navegador.
  - validacion final de cutover.

## Outcome
Migracion base a Astro ya implementada en workspace paralelo `site-new-astro/` con build funcionando. El plan permanece activo hasta completar validacion visual final y definir cutover operativo.

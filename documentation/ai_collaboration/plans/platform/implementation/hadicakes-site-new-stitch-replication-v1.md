# HadiCakes - Site New Stitch Replication v1

> **Type:** `Implementation`
> **Status:** `Complete`
> **Created:** `2026-03-25`
> **Last Updated:** `2026-03-25`

## Cross-References
| Documento | Ruta | Uso |
|---|---|---|
| Flujo canonico SDD | `documentation/ai_collaboration/spec-driven-flow-v1.md` | Marco de ejecucion de tarea compleja |
| Instrucciones de implementacion | `documentation/ai_implementation/implementation-instructions.md` | Guardrails spec-first del repositorio |
| Mapa del sistema | `documentation/ai_collaboration/system-map.md` | Contexto transversal del proyecto |
| Sitio actual | `site/` | Referencia de estructura web existente |

## Contexto
El usuario solicito tomar el ultimo diseno de Stitch del proyecto `HadiCakes` y convertirlo en un sitio real dentro de `site-new/` manteniendo fidelidad visual.
El entregable requiere navegacion funcional entre pantallas y version robusta con assets locales para reducir dependencia externa.

## Alcance
### In Scope
- Obtener pantallas HTML del proyecto `HadiCakes` en Stitch.
- Construir `site-new/` con las pantallas exportadas y navegacion real entre vistas.
- Localizar assets de imagen en el repositorio (`site-new/assets/...`).
- Validar consistencia de rutas, enlaces y carga estatica.
- Registrar trazabilidad en plan/index/handoff.

### Out of Scope
- Reescritura del generador content-driven de `site/`.
- Integracion de publicaciones live o despliegue a produccion.
- Cambios en runtime bot (`src/runtime`, `src/tools`) no relacionados al sitio.

## Approach
| # | Paso | Estado | Notas |
|---|---|---|---|
| 1 | Descubrir contexto del repo y localizar proyecto Stitch mas reciente | Completed | Proyecto `HadiCakes` identificado y pantallas listadas |
| 2 | Crear base `site-new` desde export HTML y conectar navegacion entre pantallas | Completed | 8 paginas HTML (`index`, `home`, `app-shell` y 5 vistas) con rutas funcionales |
| 3 | Descargar y referenciar assets locales (imagenes/vendor) para robustez | Completed | Imagenes (`41`), runtime Tailwind CDN local, CSS de fuentes local y TTF locales |
| 4 | Validar estructura final y cerrar trazabilidad documental | Completed | Validaciones ejecutadas + plan/index/handoff actualizados |

## Decisions & Trade-offs
| Decision | Rationale | Date |
|---|---|---|
| Replicar directamente desde export HTML de Stitch | Maximiza fidelidad visual y reduce reinterpretaciones | 2026-03-25 |
| Crear `site-new/` separado del `site/` actual | Permite iterar sin afectar flujo content-driven existente | 2026-03-25 |

## Validation
- Tests/comandos a ejecutar:
  - `rg -n "https://lh3.googleusercontent.com/aida-public|https://fonts.googleapis.com|https://fonts.gstatic.com|cdn.tailwindcss.com|href=\"#\"" site-new/*.html`
  - `node -e "<verificacion de referencias assets/* existentes>"`
  - `python3 -m http.server 4174 --directory site-new` + `curl http://127.0.0.1:4174/<pagina>` (8 paginas)
- Criterio de aceptacion:
  - `site-new/` contiene paginas del diseno Stitch con navegacion funcional.
  - Assets visuales principales cargan desde rutas locales del repo.
  - Plan/index/handoff quedan consistentes al cierre.
  - Nota de entorno: el primer intento de servidor local en sandbox fallo por permisos de bind (`PermissionError`); se valido con ejecucion fuera del sandbox.

## Outcome
`site-new/` replica el ultimo diseno de Stitch `HadiCakes` con navegacion real y assets locales para mayor robustez operativa.
Se mantuvo fidelidad visual de layout/tokens y se eliminaron dependencias remotas de imagenes y Google Fonts en HTML/CSS.

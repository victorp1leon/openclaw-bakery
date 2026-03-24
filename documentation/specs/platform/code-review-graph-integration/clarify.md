# Code Review Graph Integration - Clarifications

> **Domain:** `platform`
> **Feature Slug:** `code-review-graph-integration`
> **Status:** `In Progress`
> **Created:** `2026-03-24`
> **Last Updated:** `2026-03-24`
> **Legacy Sources:** `N/A`

## Open Questions
1. ¿El flujo inicial se expone como herramienta admin dedicada o como skill tecnico interno?
2. ¿El comando externo se ejecuta via CLI local o via servicio/MCP desacoplado en v1?
3. ¿Que limite maximo de salida (`bytes` o `chars`) se adopta para prevenir respuestas excesivas?

## Decisions
| Decision | Rationale | Date |
|---|---|---|
| Integrar `code-review-graph` como dependencia externa desacoplada del repo OpenClaw | Evita subrepos embebidos y reduce riesgo de drift | 2026-03-24 |
| Definir defaults de seguridad desde v1 (`include_source=false`, allowlist y timeout) | Principio least-privilege y minimizacion de fuga | 2026-03-24 |
| Basar adapter en patron de comando controlado similar a `runGwsCommand` | Reutiliza estrategia probada de timeout + salida estructurada | 2026-03-24 |

## Deferred Items
- Seleccion final del canal de exposicion UX (admin command vs intent dedicado) hasta cerrar implementacion runtime.
- Politica de cache/actualizacion incremental del grafo para repos grandes (v1.1).
- Modo multi-repo por tenant u owner (fuera de alcance v1).

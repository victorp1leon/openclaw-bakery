# Admin Health - Clarifications

> **Domain:** `runtime`
> **Feature Slug:** `admin-health`
> **Status:** `Complete`
> **Created:** `2026-03-23`
> **Last Updated:** `2026-03-23`
> **Legacy Sources:** `N/A`

## Open Questions
1. ¿Conviene exponer en v1.1 métricas de latencia por chequeo para troubleshooting más fino?
2. ¿Debemos limitar todavía más el detalle por check para respuestas en canal público?

## Decisions
| Decision | Rationale | Date |
|---|---|---|
| Iniciar como intent read-only sin confirm flow | Mantiene consistencia con consultas operativas y reduce friccion | 2026-03-23 |
| Reutilizar `src/health/healthcheck.ts` como fuente primaria | Evita duplicar logica y reduce riesgo de drift | 2026-03-23 |
| Bloquear detalle sensible por seguridad | Principio least-privilege y politicas de logging seguro | 2026-03-23 |
| Agregar fallback deterministico para frases admin comunes | Permite usar `admin.health` aun sin routing OpenClaw activo | 2026-03-23 |

## Deferred Items
- Definir contrato final para estructura detallada por subsistema (`v1.1`).
- Evaluar inclusion de metricas de latencia si aporta valor operativo real.

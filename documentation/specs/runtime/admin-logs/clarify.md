# Admin Logs - Clarifications

> **Domain:** `runtime`
> **Feature Slug:** `admin-logs`
> **Status:** `Complete`
> **Created:** `2026-03-25`
> **Last Updated:** `2026-03-25`
> **Legacy Sources:** `N/A`

## Open Questions
1. ¿Conviene agregar filtros adicionales (`intent`, `status`, rango de fechas) en `v1.1`?
2. ¿Se requiere politica de retencion configurable para `operations` en canal admin?

## Decisions
| Decision | Rationale | Date |
|---|---|---|
| Base de datos fuente: tabla `operations` | Ya contiene trazas persistidas con `operation_id`, `chat_id`, `intent`, `status`, timestamps | 2026-03-25 |
| Default sin filtros: `chat_id` actual | Reduce riesgo de consultas amplias involuntarias | 2026-03-25 |
| Salida resumida con `payload_preview` redaccionado | Mantiene utilidad operativa sin exponer payload crudo | 2026-03-25 |
| Soporte dual OpenClaw + fallback deterministico | Resiliencia con y sin routing read-only LLM | 2026-03-25 |

## Deferred Items
- Filtros avanzados (`intent/status/date range`) en `v1.1`.
- Politica de retencion operativa para `operations` en `v1.1`.

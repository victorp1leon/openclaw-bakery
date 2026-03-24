# Admin Config View - Clarifications

> **Domain:** `runtime`
> **Feature Slug:** `admin-config-view`
> **Status:** `Complete`
> **Created:** `2026-03-24`
> **Last Updated:** `2026-03-24`
> **Legacy Sources:** `N/A`

## Open Questions
1. ¿En v1.1 conviene agregar niveles/severidad (warnings) por configuracion riesgosa?
2. ¿Debemos agregar versionado de schema del snapshot para compatibilidad de clientes externos?

## Decisions
| Decision | Rationale | Date |
|---|---|---|
| Salida estrictamente sanitizada por diseño (booleans/counts/flags) | Reduce riesgo de fuga accidental en canal | 2026-03-24 |
| Entrega read-only sin confirm flow | Consistencia con capacidades admin de consulta | 2026-03-24 |
| Soporte dual: OpenClaw read-only + fallback deterministico | Resiliencia operativa con y sin routing OpenClaw | 2026-03-24 |

## Deferred Items
- Alertas proactivas por configuracion insegura (`v1.1`).
- Snapshot versionado para consumo externo (`v1.1`).

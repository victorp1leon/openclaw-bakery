# Report Reminders - Clarifications

> **Domain:** `runtime`
> **Feature Slug:** `report-reminders`
> **Status:** `Complete`
> **Created:** `2026-03-24`
> **Last Updated:** `2026-03-24`
> **Legacy Sources:** `N/A`

## Open Questions
1. ¿El umbral `due_soon` debe ser fijo (120 min) o configurable por entorno/canal?
2. ¿Debemos incluir semaforos visuales adicionales por prioridad en v1?

## Decisions
| Decision | Rationale | Date |
|---|---|---|
| Reusar `report.orders` como dependencia base de lectura | Evita duplicar acceso a `Pedidos` y mantiene filtros periodicos consistentes | 2026-03-24 |
| Mantener `dueSoonMinutes=120` por defecto en v1 | Cobertura operativa inmediata con regla simple y explicable | 2026-03-24 |
| Tratar fechas invalidas como `inconsistencies` visibles | Prioriza continuidad operativa y transparencia de calidad de datos | 2026-03-24 |

## Deferred Items
- Umbral por canal/turno (`v1.1`).
- Agrupado por franja horaria (manana/tarde/noche) (`v1.1`).

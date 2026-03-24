# Schedule Week View - Clarifications

> **Domain:** `runtime`
> **Feature Slug:** `schedule-week-view`
> **Status:** `Complete`
> **Created:** `2026-03-24`
> **Last Updated:** `2026-03-24`
> **Legacy Sources:** `N/A`

## Open Questions
1. ¿El bloque `reminders` semanal debe incluir alertas temporales (ej. <=24h) en v1 o solo ventana de entregas?
2. ¿Necesitamos limitar respuesta semanal por dias con carga para canales con limite de longitud?

## Decisions
| Decision | Rationale | Date |
|---|---|---|
| Reusar `schedule.day_view` como dependencia base para agregacion semanal | Evita duplicar logica de filtrado/inconsistencias y mantiene contrato consistente | 2026-03-24 |
| Mantener salida semanal en modo read-only sin confirm flow | Alineado con capacidades de consulta (`report/orders`, `schedule.day_view`) | 2026-03-24 |
| Permitir fecha ancla explicita (`YYYY-MM-DD`) ademas de frases relativas | Reduce ambiguedad operativa en planeacion semanal | 2026-03-24 |

## Deferred Items
- Alertas de proximidad y semaforos por carga de trabajo (`v1.1`).
- Resumen compacto por canal con paginacion/continuacion (`v1.1`).

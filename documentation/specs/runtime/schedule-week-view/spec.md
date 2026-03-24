# Schedule Week View - Spec

> **Domain:** `runtime`
> **Feature Slug:** `schedule-week-view`
> **Status:** `Verified`
> **Created:** `2026-03-24`
> **Last Updated:** `2026-03-24`
> **Legacy Sources:** `N/A`

## Objective
Entregar `schedule.week_view` como capacidad read-only para agenda semanal de la panaderia, consolidando carga operativa de lunes a domingo sin mutar sistemas externos.

## Inputs / Outputs
- Inputs:
  - Mensajes de agenda semanal (`agenda semanal`, `esta semana`, `proxima semana`, `semana de YYYY-MM-DD`).
  - `Pedidos` via `gws` (indirectamente a traves de `schedule.day_view`).
  - Config de timezone y conectores de lectura.
- Outputs:
  - Respuesta semanal con bloques: `days/reminders`, `preparation`, `suggestedPurchases`.
  - `inconsistencies` visibles con `dateKey`.
  - `trace_ref` visible en exito/fallo controlado.

## Business Rules
1. `schedule.week_view` es read-only; no usa confirm flow ni mutaciones.
2. La semana se calcula en `America/Mexico_City` (o timezone configurado) con rango lunes-domingo.
3. Debe aceptar scope semanal relativo (`esta semana`, `proxima semana`) y fecha ancla explicita (`YYYY-MM-DD`, `DD/MM/YYYY`, `DD de mes`).
4. Debe consolidar preparacion e insumos sugeridos a nivel semanal, preservando orden deterministico.
5. Si hay datos parciales invalidos, responder con agenda parcial + `inconsistencies` (nunca ocultar).
6. Si falla un dia en la agregacion, responder fallo controlado con `Ref`.

## Error Behavior
- `schedule_week_view_week_invalid`: fecha ancla invalida.
- `schedule_week_view_day_failed:<dateKey>:<detail>`: fallo en dependencia diaria.
- Runtime debe convertir fallos a mensaje controlado con `Ref: schedule-week-view:<operation_id>`.

## Test Cases
1. Semana invalida devuelve error deterministico.
2. Agregacion semanal conserva orden lunes-domingo y suma de pedidos.
3. Inconsistencias/asunciones diarias se propagan al consolidado.
4. Runtime resuelve agenda semanal directa sin confirm flow.
5. Runtime pide `schedule_week_query` cuando falta semana y continua al resolver.
6. Runtime devuelve `Ref` en fallo controlado de `schedule.week_view`.

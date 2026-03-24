# Report Reminders - Spec

> **Domain:** `runtime`
> **Feature Slug:** `report-reminders`
> **Status:** `Verified`
> **Created:** `2026-03-24`
> **Last Updated:** `2026-03-24`
> **Legacy Sources:** `N/A`

## Objective
Entregar `report.reminders` como capacidad read-only para priorizar pedidos proximos y atrasados por periodo operativo, sin mutar sistemas externos.

## Inputs / Outputs
- Inputs:
  - Mensajes de recordatorios (`recordatorios de hoy`, `recordatorios de esta semana`, `recordatorios de marzo`, `recordatorios de este año`).
  - `report.orders` como dependencia de lectura base por periodo (`day|week|month|year`).
  - Config de timezone y umbral de proximidad (`dueSoonMinutes`, default 120).
- Outputs:
  - Respuesta de recordatorios con bloques priorizados por urgencia.
  - Campos de reminder: `reminder_status`, `minutes_to_delivery`.
  - `inconsistencies` visibles para filas sin fecha valida.
  - `trace_ref` visible en exito/fallo controlado.

## Business Rules
1. `report.reminders` es read-only; no usa confirm flow ni mutaciones.
2. Debe aceptar periodos relativos y explicitos (`hoy|semana|mes|año`, ademas de fechas/meses detectables).
3. Clasificacion de urgencia:
   - `overdue`: entrega en pasado.
   - `due_soon`: entrega dentro del umbral configurable.
   - `upcoming`: entrega posterior al umbral.
4. El orden de salida debe ser deterministico:
   - primero `overdue`, luego `due_soon`, luego `upcoming`;
   - dentro de cada grupo, proximidad por `minutes_to_delivery`.
5. Filas con fecha invalida no deben romper el flujo:
   - se excluyen de ranking,
   - se exponen en `inconsistencies`.
6. Runtime debe pedir periodo cuando falte (`hoy|semana|mes|año`) y reanudar al resolver.

## Error Behavior
- `report_reminders_period_invalid`: periodo no interpretable.
- `report_reminders_execution_failed`: fallo de proveedor/dependencia en tiempo de ejecucion.
- Runtime convierte fallos a mensaje controlado con `Ref: report-reminders:<operation_id>`.

## Test Cases
1. Ordena recordatorios por urgencia y proximidad.
2. Mantiene inconsistencias heredadas y agrega inconsistencias por fecha invalida.
3. Respeta `limit` de salida preservando `total`.
4. Runtime responde recordatorios por periodo sin confirm flow.
5. Runtime pide periodo faltante y continua al resolver.
6. Runtime devuelve `Ref` en fallo controlado de `report.reminders`.

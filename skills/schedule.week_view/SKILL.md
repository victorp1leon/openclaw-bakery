---
name: schedule.week_view
description: Use when user asks for weekly agenda and needs read-only weekly load, preparation, purchases, inconsistencies, and trace reference.
---

# skill: schedule.week_view

## Overview
Consulta la agenda semanal en modo read-only usando `Pedidos` y responde en bloques operativos:
- `days/reminders`
- `preparation`
- `suggestedPurchases`

Tambien reporta:
- `inconsistencies` (datos incompletos o invalidos detectados por dia)
- `trace_ref` (referencia para soporte en exito/error)

## When To Use
- El usuario pide agenda semanal (`esta semana`, `proxima semana` o fecha ancla).
- Se necesita plan operativo semanal sin mutar sistemas externos.
- Se requiere visibilidad de datos problematicos sin detener toda la respuesta.

## When Not To Use
- Mutaciones de pedidos/pagos/inventario.
- Reportes agregados financieros o de utilidad.
- Consulta de un solo dia (`schedule.day_view`) cuando no se pide semana.

## Input Contract
- Texto libre en espanol con intencion de agenda semanal.
- Query de semana:
  - relativa (`esta semana`, `proxima semana`)
  - fecha ancla (`2026-03-23`, `23/03/2026`)
- Si no hay semana clara, runtime solicita `schedule_week_query`.

## Output Contract
- Respuesta read-only con carga por dias y consolidado semanal.
- `inconsistencies[]` visible cuando existen filas excluidas o datos invalidos.
- `trace_ref` visible para soporte.
- Sin confirm flow (`confirmar|cancelar`) y sin mutaciones.

## Workflow
1. Detectar intencion de agenda semanal.
2. Resolver semana objetivo (lunes-domingo) con timezone del sistema.
3. Ejecutar agregacion diaria read-only (`schedule.day_view`) para cada fecha.
4. Consolidar bloques de preparacion y compras sugeridas.
5. Exponer `inconsistencies` y `assumptions` sin ocultar datos parciales.
6. Responder resumen semanal con `trace_ref`.

## Safety Constraints
- Nunca escribir en fuentes externas.
- No ocultar errores de datos: exponerlos en `inconsistencies`.
- No exponer secretos, stderr crudo o detalles internos del provider.
- En fallo controlado, responder con `Ref: <trace_ref>`.

## Common Mistakes
- Tratar la agenda semanal como reporte financiero (`report.orders`).
- No propagar inconsistencias diarias al consolidado semanal.
- Omitir `trace_ref` en respuestas de error.

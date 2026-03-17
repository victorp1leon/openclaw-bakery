---
name: order.report
description: Use when user asks for read-only order summaries by day/week/month/year without mutating order state.
---

# skill: order.report

## Overview
Consulta y resume pedidos por periodo operativo (`day|week|month|year`) en modo solo lectura. No modifica pedidos ni estado de confirmacion.

## When To Use
- El usuario pide resumen/listado de pedidos por fecha o periodo.
- Se requiere vista operativa para planeacion/seguimiento.
- El flujo debe ser read-only.

## When Not To Use
- Consultar detalle puntual de un solo pedido (`order.lookup` / `order.status`).
- Mutaciones de pedido/pago/inventario.
- Publicacion web.

## Input Contract
- Periodo soportado:
  - `day` (`YYYY-MM-DD`)
  - `week` (fecha ancla)
  - `month` (`year` + `month`)
  - `year` (`year`)
- Ejemplos:
  - `que pedidos tengo hoy`
  - `reporte de pedidos de esta semana`
  - `pedidos de marzo 2026`

## Output Contract
- Reporte con:
  - periodo aplicado
  - zona horaria
  - total de pedidos
  - lista resumida de pedidos
- Errores deterministas `order_report_*` para payload/config/provider invalidos.

## Workflow
1. Detectar consulta de reporte por periodo.
2. Resolver periodo objetivo (day/week/month/year).
3. Consultar `Pedidos` en modo read-only.
4. Filtrar por fecha de entrega segun timezone configurada.
5. Responder con resumen y listado ordenado por fecha/hora.

## Safety Constraints
- Nunca ejecutar mutaciones durante reportes.
- No incluir secretos ni errores crudos de proveedor en respuesta.
- Mantener filtros deterministas por periodo y timezone.

## Common Mistakes
- Tratar consulta de reporte como `order.lookup` puntual.
- Omitir timezone al interpretar fechas.
- Mezclar periodos ambiguos sin aclaracion.

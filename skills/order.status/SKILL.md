---
name: order.status
description: Use when user asks for order status (payment/operational state) by folio, operation id, customer name, or product in read-only mode.
---

# skill: order.status

## Overview
Consulta el estado de pedidos existentes desde lenguaje natural y responde en modo read-only, sin ejecutar mutaciones ni confirm flow.

## When To Use
- El usuario pide estado/estatus/status de un pedido.
- La consulta incluye folio, operation id, nombre del cliente o producto.
- Se requiere respuesta inmediata sin confirmacion de ejecucion.

## When Not To Use
- Crear, editar, cancelar pedidos o registrar pagos.
- Operaciones que requieran escritura en Trello/Sheets.
- Reportes por periodo (`hoy`, `semana`, `mes`, `año`) que pertenecen a `report.orders`.

## Input Contract
- Texto libre en espanol con intencion de estado.
- Ejemplos:
  - `cual es el estado del pedido folio op-123`
  - `dime el estatus del pedido de ana`
  - `status del pedido op-xyz`

## Output Contract
- Respuesta textual resumida con:
  - coincidencias encontradas
  - estado de pago y estado operativo (`programado|hoy|atrasado|cancelado`)
  - datos minimos por pedido (folio, fecha, cliente, producto, total)
- Si no hay coincidencias, responder sin error y de forma deterministica.

## Workflow
1. Detectar intencion de estado de pedido.
2. Extraer `query` (folio/id/nombre/producto).
3. Ejecutar lectura read-only en fuente `Pedidos`.
4. Derivar estado operativo y formatear respuesta breve y trazable.

## Safety Constraints
- Nunca ejecutar operaciones de escritura.
- No exponer secretos o errores crudos de provider.
- Mantener respuesta controlada ante fallas de conectividad.

## Common Mistakes
- Confundir estado de pedido con consulta general (`order.lookup`) o reporte por periodo.
- Intentar cancelar/actualizar desde esta ruta.
- Mostrar stack traces o detalles internos al usuario.

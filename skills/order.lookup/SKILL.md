---
name: order.lookup
description: Use when user asks to consult existing orders by folio, operation id, customer name, or product in read-only mode.
---

# skill: order.lookup

## Overview
Consulta pedidos existentes desde lenguaje natural y responde resultados en modo read-only, sin ejecutar mutaciones ni confirm flow.

## When To Use
- El usuario pide buscar/consultar un pedido existente.
- La consulta incluye folio, operation id, nombre del cliente o producto.
- Se requiere respuesta inmediata sin confirmacion de ejecucion.

## When Not To Use
- Crear, editar o cancelar pedidos.
- Operaciones que requieran escritura en Trello/Sheets.
- Reportes por periodo (`hoy`, `semana`, `mes`) que pertenecen a `report.orders`.

## Input Contract
- Texto libre en espanol con intencion de consulta.
- Ejemplos:
  - `consulta pedido de ana`
  - `buscar pedido folio op-123`
  - `dime el estado del pedido de cupcakes`

## Output Contract
- Respuesta textual resumida con:
  - coincidencias encontradas
  - datos minimos por pedido (`folio`, `operation_id`, fecha, cliente, producto, cantidad, estado pago, total)
  - `Ref: <trace_ref>` visible para soporte
- Si no hay coincidencias, responder sin error, con sugerencia de refinamiento (folio/operation_id/nombre) y `Ref`.

## Workflow
1. Detectar intencion de consulta de pedido.
2. Extraer `query` de lookup (folio/id/nombre/producto).
3. Ejecutar lectura read-only en fuente `Pedidos`.
4. Formatear respuesta breve y trazable.
5. Si hay mas coincidencias que el limite configurado, mostrar vista truncada y `... y N más`.

## Safety Constraints
- Nunca ejecutar operaciones de escritura.
- No exponer secretos o errores crudos de provider.
- Mantener respuesta controlada ante fallas de conectividad.

## Common Mistakes
- Confundir consulta con alta de pedido.
- Tratar queries de periodo (`hoy/semana/mes`) como lookup.
- Mostrar stack traces o detalles internos al usuario.

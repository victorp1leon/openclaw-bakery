---
name: order.update
description: Use when user asks to update an existing order (date, quantity, shipping, payment, notes, etc.) and requires confirm flow before mutation.
---

# skill: order.update

## Overview
Actualiza pedidos existentes en `Pedidos` mediante referencia (`folio` u `operation_id_ref`) y `patch` controlado. Siempre requiere resumen + confirmacion explicita antes de ejecutar la mutacion, y aplica consistencia Trello+Sheets con rollback en fallo parcial.

## When To Use
- El usuario quiere cambiar datos de un pedido ya registrado.
- La solicitud incluye referencia del pedido y valores a actualizar.
- La operacion debe ser trazable por `operation_id`.

## When Not To Use
- Crear un pedido nuevo (`order.create`).
- Consultar pedido sin mutacion (`order.lookup` / `order.status`).
- Cancelar pedido o registrar pago (skills separadas).

## Input Contract
- Texto libre en espanol con intencion de actualizacion.
- Referencia por `folio` o `operation_id_ref` (si falta, runtime intenta resolver por lookup textual y pide aclaracion si hay ambiguedad).
- `patch` con campos permitidos (JSON inline o lenguaje natural). Si falta, runtime pide aclaracion del cambio.
- Ejemplos:
  - `actualiza pedido folio op-123 {"patch":{"cantidad":18}}`
  - `cambia pedido id op-abc {"patch":{"estado_pago":"pagado","notas":"liquidado"}}`
  - `actualiza pedido de ana, cambia cantidad a 12`

## Output Contract
- Antes de ejecutar: resumen estructurado + instruccion `confirmar | cancelar`.
- Al confirmar: ejecucion de `update-order` y respuesta final trazable por `operation_id`.
- Si falta referencia o patch: flujo de aclaracion (`order_reference` / `order_update_patch`) con el mismo `operation_id`.
- Si lookup por referencia textual es ambiguo: lista corta (max 5) y solicitud de `folio|operation_id`.

## Workflow
1. Detectar intencion de mutacion de pedido (`actualizar|cambiar|modificar`).
2. Extraer referencia (`folio|operation_id_ref`) y `patch` permitido (JSON o texto).
3. Si falta referencia, intentar resolver via lookup textual; en ambiguedad pedir seleccion explicita.
4. Si falta patch, pedir faltante (`order_update_patch`) y mantener la misma operacion pendiente.
5. Persistir operacion `pending_confirm` con `idempotency_key=operation_id`.
6. Mostrar resumen y esperar `confirmar|cancelar`.
7. En confirmacion, ejecutar tool `update-order` y persistir resultado (`executed|failed`).
8. Validar que Trello y Sheets queden consistentes; si Sheets falla despues de Trello, revertir Trello.

## Safety Constraints
- Nunca mutar sin confirmacion explicita.
- No permitir campos inmutables (`folio`, `chat_id`, `operation_id`, etc.).
- Revalidar invariantes de envio (`envio_domicilio` requiere `direccion`).
- No exponer secretos ni stderr crudo en respuestas al usuario.

## Common Mistakes
- Intentar actualizar sin cambios concretos (`patch`).
- Enviar referencia ambigua sin seleccionar `folio|operation_id`.
- Mezclar consulta read-only con mutacion en el mismo flujo.

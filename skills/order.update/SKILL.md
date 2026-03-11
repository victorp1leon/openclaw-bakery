---
name: order.update
description: Use when user asks to update an existing order (date, quantity, shipping, payment, notes, etc.) and requires confirm flow before mutation.
---

# skill: order.update

## Overview
Actualiza pedidos existentes en `Pedidos` mediante referencia (`folio` u `operation_id_ref`) y `patch` controlado. Siempre requiere resumen + confirmacion explicita antes de ejecutar la mutacion.

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
- Referencia obligatoria por `folio` o `operation_id_ref`.
- `patch` en JSON inline con campos permitidos.
- Ejemplos:
  - `actualiza pedido folio op-123 {"patch":{"cantidad":18}}`
  - `cambia pedido id op-abc {"patch":{"estado_pago":"pagado","notas":"liquidado"}}`

## Output Contract
- Antes de ejecutar: resumen estructurado + instruccion `confirmar | cancelar`.
- Al confirmar: ejecucion de `update-order` y respuesta final trazable por `operation_id`.
- Si falta referencia o patch valido: error de parseo controlado (`order_update_*`).

## Workflow
1. Detectar intencion de mutacion de pedido (`actualizar|cambiar|modificar`).
2. Extraer referencia (`folio|operation_id_ref`) y `patch` permitido.
3. Persistir operacion `pending_confirm` con `idempotency_key=operation_id`.
4. Mostrar resumen y esperar `confirmar|cancelar`.
5. En confirmacion, ejecutar tool `update-order` y persistir resultado (`executed|failed`).

## Safety Constraints
- Nunca mutar sin confirmacion explicita.
- No permitir campos inmutables (`folio`, `chat_id`, `operation_id`, etc.).
- Revalidar invariantes de envio (`envio_domicilio` requiere `direccion`).
- No exponer secretos ni stderr crudo en respuestas al usuario.

## Common Mistakes
- Intentar actualizar sin `patch` JSON.
- Enviar referencia ambigua o inexistente.
- Mezclar consulta read-only con mutacion en el mismo flujo.

---
name: payment.record
description: Use when user asks to register or update payment status for an existing order and requires confirm flow before mutation.
---

# skill: payment.record

## Overview
Registra un evento de pago en un pedido existente (`Pedidos`) mediante referencia (`folio` u `operation_id_ref`). Actualiza `estado_pago`, agrega traza auditable en `notas` y requiere confirmacion explicita antes de ejecutar la mutacion.

## When To Use
- El usuario quiere registrar un pago o cambio de estado de pago (`pagado|pendiente|parcial`).
- La solicitud apunta a un pedido ya existente.
- Se requiere trazabilidad por `operation_id`.

## When Not To Use
- Crear o cancelar pedidos (`order.create`, `order.cancel`).
- Actualizar campos generales del pedido (`order.update`).
- Consultas read-only (`order.lookup`, `order.status`).

## Input Contract
- Texto libre en espanol con intencion de pago.
- Referencia por `folio` o `operation_id_ref` (si falta, runtime intenta resolver por lookup textual y pide aclaracion si hay ambiguedad).
- `estado_pago` obligatorio: `pagado | pendiente | parcial`.
- `monto`, `metodo`, `notas` opcionales.
- Ejemplos:
  - `registra pago del pedido folio op-123 estado pagado`
  - `aplica pago pedido id op-xyz {"payment":{"estado_pago":"parcial","monto":350,"metodo":"transferencia"}}`

## Output Contract
- Antes de ejecutar: resumen estructurado + `confirmar | cancelar`.
- Al confirmar: ejecucion de `record-payment` con resultado trazable por `operation_id`.
- Si falta referencia o `estado_pago`: flujo de aclaracion con el mismo `operation_id`.
- Si lookup por referencia textual es ambiguo: lista corta (max 5) y solicitud de `folio|operation_id`.
- Si el pedido ya esta cancelado: rechazo controlado de mutacion.
- Si el pago ya fue registrado para el mismo `operation_id`: no-op explicito (`Pago ya registrado para <folio>. operation_id: <operation_id>`).

## Workflow
1. Detectar intencion de pago (`registra|aplica|abona|liquida` + `pago|abono|estado de pago`).
2. Extraer referencia y payload de pago (`estado_pago` obligatorio).
3. Si falta referencia, intentar resolver via lookup textual; en ambiguedad pedir seleccion explicita.
4. Registrar operacion en `pending_confirm` con `idempotency_key=operation_id`.
5. Mostrar resumen y esperar `confirmar|cancelar`.
6. En confirmacion, ejecutar `record-payment` y persistir `executed|failed`.
7. En ejecucion, actualizar `estado_pago` y anexar evento `[PAGO]` en `notas` sin perder historial.

## Safety Constraints
- Nunca mutar sin confirmacion explicita.
- Rechazar mutacion si `estado_pedido=cancelado` (source-of-truth de cancelacion).
- No exponer secretos ni errores crudos de proveedor.
- Mantener salida y errores en tokens deterministas (`payment_record_*`).

## Common Mistakes
- Enviar pago sin referencia valida del pedido.
- Intentar registrar pago sin `estado_pago`.
- Mezclar este flujo con cambios de otros campos de pedido.
- Duplicar eventos de pago al reintentar sin respetar idempotencia.

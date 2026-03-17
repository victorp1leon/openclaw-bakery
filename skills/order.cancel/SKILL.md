---
name: order.cancel
description: Use when user asks to cancel an existing order and requires confirm flow before mutation.
---

# skill: order.cancel

## Overview
Cancela pedidos existentes en `Pedidos` sin borrar historial. Usa un marker auditable en `notas` (`[CANCELADO]`), marca `estado_pedido=cancelado`, mueve la tarjeta Trello a la lista de cancelados y requiere confirmacion explicita antes de ejecutar.

## When To Use
- El usuario pide cancelar un pedido existente.
- La solicitud incluye referencia por `folio` o `operation_id_ref` (o permite resolucion unica por cliente).
- Se requiere trazabilidad por `operation_id`.

## When Not To Use
- Crear o actualizar contenido de pedido (`order.create`, `order.update`).
- Consultas read-only (`order.lookup`, `order.status`).
- Registro de pago (`payment.record`).

## Input Contract
- Texto libre en espanol con intencion de cancelacion.
- Referencia obligatoria del pedido.
- `motivo` opcional.
- Ejemplos:
  - `cancela pedido folio op-123`
  - `cancela pedido id op-xyz {"motivo":"cliente cancelo"}`

## Output Contract
- Antes de ejecutar: resumen estructurado + `confirmar | cancelar`.
- Al confirmar: `cancel-order` agrega marker `[CANCELADO]` en `notas`.
- Al confirmar: se sincroniza Trello + Sheets en modo transaccional (rollback si falla alguno).
- Si ya estaba cancelado: respuesta exitosa idempotente (`already_canceled=true`) sin duplicar marker.
- Si se repite cancelacion sobre pedido ya cancelado: respuesta determinista `Este pedido ya fue cancelado con folio <folio>`.

## Workflow
1. Detectar intencion de cancelacion (`cancela|cancelar|anula`).
2. Extraer referencia y `motivo` opcional.
3. Si no hay referencia explicita, intentar lookup por cliente.
   - 1 coincidencia: resolver referencia y continuar.
   - multiples coincidencias: rechazar por ambiguedad y pedir `folio|operation_id`.
   - sin coincidencias: pedir `folio|operation_id`.
4. Registrar operacion `pending_confirm` con `idempotency_key=operation_id`.
5. Mostrar resumen y esperar `confirmar|cancelar`.
6. En confirmacion, ejecutar `cancel-order` y persistir `executed|failed`.
7. Si falla Sheets tras mover en Trello, revertir tarjeta a snapshot previo.

## Safety Constraints
- Nunca ejecutar mutacion sin confirmacion explicita.
- Nunca borrar la fila de pedido (solo soft-cancel por marker).
- No exponer secretos ni errores crudos de provider.
- Bloquear cancelacion para estados terminales (`entregado|completado`).

## Common Mistakes
- Cancelar sin referencia valida.
- Duplicar marker de cancelacion cuando ya existe.
- Usar cancelacion para registrar pagos (ruta incorrecta).

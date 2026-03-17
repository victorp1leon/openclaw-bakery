---
name: inventory.consume
description: Use when user asks to consume inventory for an existing order reference and requires explicit confirm flow before mutation.
---

# skill: inventory.consume

## Overview
Consume inventario para un pedido existente por referencia (`folio` u `operation_id_ref`). Descuenta stock en `Inventario`, escribe movimientos auditables en `MovimientosInventario` y requiere confirmacion explicita antes de ejecutar.

## When To Use
- El usuario solicita consumo de inventario para un pedido existente.
- Existe referencia clara del pedido por `folio` o `operation_id_ref`.
- Se requiere trazabilidad e idempotencia por `operation_id`.

## When Not To Use
- Crear/actualizar/cancelar pedidos (`order.create`, `order.update`, `order.cancel`).
- Generar lista de insumos sin mutar (`shopping.list.generate`).
- Ejecutar consumo automatico al confirmar `order.create` (MVP: solo comando explicito).

## Input Contract
- Texto libre en espanol con intencion de consumo (`consume|descuenta|inventory.consume`).
- Referencia obligatoria del pedido.
- Ejemplos:
  - `consume inventario del pedido folio op-123`
  - `inventory.consume {"reference":{"operation_id_ref":"op-xyz"}}`

## Output Contract
- Antes de ejecutar: resumen estructurado + `confirmar | cancelar`.
- Al confirmar: ejecucion de `inventory-consume` con detalle de lineas consumidas y `operation_id`.
- Repeticion idempotente: respuesta controlada de replay (`Consumo ya aplicado para <folio>. operation_id: <operation_id>`).
- Errores deterministas `inventory_consume_*` para referencia invalida, receta faltante, unidades no soportadas, stock insuficiente, etc.

## Workflow
1. Detectar intencion explicita de consumo de inventario.
2. Extraer referencia de pedido (`folio|operation_id_ref`).
3. Registrar operacion en `pending_confirm` con `idempotency_key=operation_id`.
4. Mostrar resumen y esperar `confirmar|cancelar`.
5. En confirmacion, resolver pedido y validar precondiciones.
6. Construir plan de consumo por receta, convertir unidades, descontar stock y registrar movimientos auditables.
7. Persistir resultado `executed|failed` con detalle trazable.

## Safety Constraints
- Nunca ejecutar mutacion sin confirmacion explicita.
- Rechazar por ambiguedad de referencia (`inventory_consume_reference_ambiguous`).
- Rechazar cuando `estado_pedido=cancelado`.
- Conversion de unidades `g <-> kg` obligatoria; rutas no soportadas deben fallar.
- Si hay fallo parcial despues de aplicar parte de la mutacion, responder `inventory_consume_partial_failure` y exigir reconciliacion manual.
- No exponer secretos ni errores crudos de provider.

## Common Mistakes
- Lanzar consumo sin referencia valida.
- Intentar consumo con pedido cancelado.
- Asumir conversion implicita fuera de tabla soportada.
- Tratar replay idempotente como error en lugar de no-op controlado.

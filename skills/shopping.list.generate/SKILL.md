---
name: shopping.list.generate
description: Use when user asks for a read-only shopping/supplies list for one or more orders without mutating orders or inventory.
---

# skill: shopping.list.generate

## Overview
Genera una sugerencia de lista de compras/insumos en modo solo lectura, agregando productos e insumos por alcance (`day`, `week`, `order_ref`, `lookup`). No descuenta inventario ni modifica pedidos.

## When To Use
- El usuario pide lista de insumos para pedidos de un periodo o pedido especifico.
- Se requiere agregacion operativa para planeacion de compras.
- El resultado debe ser informativo (sin mutaciones).

## When Not To Use
- Consumir inventario (`inventory.consume`).
- Crear/actualizar/cancelar pedidos.
- Registrar pagos.

## Input Contract
- `scope`:
  - `day` (`YYYY-MM-DD`)
  - `week` (fecha ancla)
  - `order_ref` (`folio` u `operation_id_ref`)
  - `lookup` (texto libre)
- Ejemplos:
  - `lista de insumos de hoy`
  - `que necesito para el pedido folio op-123`
  - `lista de compras de esta semana`

## Output Contract
- Resultado estructurado con:
  - alcance aplicado
  - total de pedidos incluidos
  - productos agregados
  - insumos sugeridos agregados
  - supuestos utilizados
- Errores deterministas `shopping_list_*` para scope/config/provider invalidos.

## Workflow
1. Detectar solicitud de lista de compras/insumos.
2. Resolver alcance (`day|week|order_ref|lookup`), pidiendo dato faltante cuando aplique.
3. Consultar pedidos en modo read-only.
4. Construir agregados de productos e insumos (recetas inline o catalogo de recetas).
5. Responder con lista final y supuestos.

## Safety Constraints
- Nunca escribir en `Pedidos`, `Inventario` o `MovimientosInventario`.
- No ejecutar consumo automatico de inventario.
- No exponer secretos ni errores crudos de proveedor.

## Common Mistakes
- Confundir esta skill con `inventory.consume`.
- Ejecutar con scope ambiguo sin pedir aclaracion.
- Omitir supuestos cuando se usan recetas heuristicas/default.

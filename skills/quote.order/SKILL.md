---
name: quote.order
description: Use when user asks for a read-only quote estimate from pricing catalogs without creating or mutating orders.
---

# skill: quote.order

## Overview
Genera una cotizacion de pedido en modo solo lectura usando catalogos de precios/opciones/referencias. No crea pedidos ni modifica inventario o estado de confirmacion.

## When To Use
- El usuario pide precio estimado de un producto.
- La solicitud incluye producto, cantidad o extras de forma libre.
- Se requiere respuesta informativa sin mutacion.

## When Not To Use
- Crear, actualizar o cancelar pedidos.
- Registrar pagos o consumir inventario.
- Acciones web/publicacion.

## Input Contract
- `query` en texto libre (espanol) con datos de cotizacion.
- Ejemplos:
  - `cotiza 24 cupcakes con envio a domicilio`
  - `cuanto cuesta un pastel de chocolate para manana`

## Output Contract
- Respuesta de cotizacion con:
  - producto base detectado
  - cantidad
  - lineas de costo (base/opciones/extras/envio/urgencia)
  - subtotal y total
  - supuestos usados
- Puede incluir sugerencias de opciones por categoria cuando faltan personalizaciones.
- Errores deterministas `quote_order_*` cuando no hay producto o falla provider/config.

## Workflow
1. Detectar intencion de cotizacion (`cotiza|precio|cuanto cuesta|presupuesto`).
2. Extraer señales de producto, cantidad, envio, urgencia y personalizacion.
3. Consultar catalogos en modo read-only (`CatalogoPrecios`, `CatalogoOpciones`, `CatalogoReferencias`).
4. Calcular total estimado y construir desglose.
5. Responder con total + supuestos y, si aplica, preguntas/sugerencias guiadas.

## Safety Constraints
- Nunca ejecutar escrituras o mutaciones.
- No convertir cotizacion en `order.create` automaticamente.
- No exponer secretos ni errores crudos de proveedor.

## Common Mistakes
- Mezclar flujo de cotizacion con alta de pedido.
- Omitir supuestos cuando faltan datos en la consulta.
- Tratar referencias historicas como costo directo del total.

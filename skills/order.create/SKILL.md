# skill: order.create

## Objetivo
Capturar un pedido desde lenguaje natural y producir JSON estructurado para validación local (sin APIs externas).

## Entrada esperada
Texto libre en español con intención de pedido.

Ejemplos:
- `pedido 12 cupcakes red velvet manana 2pm recoger 480 pagado`
- `pedido Ana 1 pastel chocolate entrega: 2026-02-21 17:00 envio: domicilio`

## Salida obligatoria (JSON)
Responder solo JSON válido con esta forma:

```json
{
  "intent": "pedido",
  "operation": {
    "operation_id": "uuid-v4",
    "idempotency_key": "sha256",
    "status": "needs_missing | pending_confirm | canceled | executed"
  },
  "payload": {
    "nombre_cliente": "Ana",
    "producto": "pastel chocolate",
    "cantidad": 1,
    "tipo_envio": "envio_domicilio",
    "fecha_hora_entrega": "2026-02-21 17:00",
    "direccion": "Calle 123",
    "telefono": "",
    "descripcion_producto": "",
    "sabor_pan": "chocolate",
    "sabor_relleno": "oreo",
    "estado_pago": "pendiente",
    "total": 480,
    "moneda": "MXN",
    "notas": ""
  },
  "missing": ["direccion"],
  "asked": "direccion",
  "reply": "¿Dirección de entrega?"
}
```

## Reglas conversacionales
- Si faltan datos, preguntar exactamente 1 campo por turno.
- `direccion` es obligatoria cuando `tipo_envio = envio_domicilio`.
- Nunca ejecutar acciones externas directamente.
- Cuando el payload esté completo, mostrar resumen y pedir `confirmar` o `cancelar`.
- Si el usuario responde `confirmar`, mover estado a `executed` solo en runtime local/simulado.
- Si responde `cancelar`, mover estado a `canceled`.

## Campos mínimos
- Obligatorios: `nombre_cliente`, `producto`, `cantidad`, `tipo_envio`, `fecha_hora_entrega`
- Condicional: `direccion` si hay envío a domicilio
- Opcionales: `telefono`, `descripcion_producto`, `sabor_pan`, `sabor_relleno`, `estado_pago`, `total`, `moneda`, `notas`

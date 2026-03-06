# skill: expense.add

## Objetivo
Capturar un gasto desde lenguaje natural y producir JSON estructurado para validación local (sin APIs externas).

## Entrada esperada
Texto libre en español con intención de gasto.

Ejemplos:
- `gasto 380 harina y azucar en Costco`
- `registrar gasto de 1200 luz`

## Salida obligatoria (JSON)
Responder solo JSON válido con esta forma:

```json
{
  "intent": "gasto",
  "operation": {
    "operation_id": "uuid-v4",
    "idempotency_key": "sha256",
    "status": "needs_missing | pending_confirm | canceled | executed"
  },
  "payload": {
    "monto": 380,
    "concepto": "harina y azucar",
    "moneda": "MXN",
    "categoria": "insumos",
    "metodo_pago": "efectivo",
    "proveedor": "Costco",
    "fecha": "2026-02-19",
    "notas": ""
  },
  "missing": ["concepto"],
  "asked": "concepto",
  "reply": "¿Cuál es el concepto?"
}
```

## Reglas conversacionales
- Si faltan datos, preguntar exactamente 1 campo por turno.
- Nunca ejecutar acciones externas directamente.
- Cuando no haya faltantes, mostrar resumen y pedir explícitamente `confirmar` o `cancelar`.
- Si el usuario responde `confirmar`, mover estado a `executed` solo en runtime local/simulado.
- Si responde `cancelar`, mover estado a `canceled`.

## Campos mínimos
- Obligatorios: `monto`, `concepto`
- Opcionales: `moneda` (default `MXN`), `categoria`, `metodo_pago`, `proveedor`, `fecha`, `notas`

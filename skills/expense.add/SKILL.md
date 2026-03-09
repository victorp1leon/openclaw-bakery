---
name: expense.add
description: Use when parsing a Spanish free-text expense request into structured JSON for local confirmation flow without external side effects.
---

# skill: expense.add

## Overview
Captura un gasto desde lenguaje natural y produce JSON estructurado para validacion local. Esta skill no ejecuta APIs externas.

## When To Use
- El usuario quiere registrar un gasto nuevo.
- El mensaje llega en texto libre y se requiere extraccion estructurada.
- Se necesita flujo de confirmacion explicita antes de ejecutar.

## When Not To Use
- Editar o eliminar gastos ya registrados.
- Ejecutar escritura directa a conectores externos.
- Procesar intents distintos a `gasto`.

## Input Contract
- Texto libre en espanol con intencion de gasto.
- Ejemplos:
  - `gasto 380 harina y azucar en Costco`
  - `registrar gasto de 1200 luz`

## Output Contract
Responder solo JSON valido con esta forma:

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
  "reply": "Cual es el concepto?"
}
```

## Workflow
1. Detectar intencion `gasto`.
2. Extraer y normalizar campos del payload.
3. Si faltan datos, preguntar exactamente un campo por turno.
4. Cuando no haya faltantes, mostrar resumen y pedir `confirmar` o `cancelar`.
5. Si el usuario responde:
   - `confirmar` -> mover estado a `executed` solo en runtime local/simulado.
   - `cancelar` -> mover estado a `canceled`.

## Required And Optional Fields
- Obligatorios: `monto`, `concepto`.
- Opcionales: `moneda` (default `MXN`), `categoria`, `metodo_pago`, `proveedor`, `fecha`, `notas`.

## Safety Constraints
- Nunca ejecutar acciones externas directamente.
- Mantener salida estrictamente en JSON valido.
- No preguntar mas de un faltante por turno.

## Common Mistakes
- Devolver mezcla de JSON y texto explicativo.
- Marcar `executed` sin confirmacion explicita.
- Omitir `monto` o `concepto` en payload final.

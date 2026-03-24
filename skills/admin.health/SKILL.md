---
name: admin.health
description: Use when admin asks for bot/system operational health in read-only mode with sanitized checks and trace reference.
---

# skill: admin.health

## Overview
Consulta salud operativa del bot en modo read-only y responde estado resumido con checks sanitizados y `Ref` para soporte.

## When To Use
- El usuario admin pregunta por salud/estado del bot o sistema.
- Ejemplos: `estado del bot`, `admin health`, `salud del sistema`.
- Se requiere diagnostico rapido sin mutaciones.

## When Not To Use
- Cambios de configuracion o allowlist.
- Consulta de logs detallados.
- Mutaciones de pedidos, pagos, inventario o web.

## Input Contract
- Texto libre en espanol/ingles con intencion de healthcheck admin.
- No requiere payload estructurado adicional.

## Output Contract
- Respuesta textual con:
  - estado general (`OK|DEGRADED|ERROR`)
  - lista de checks relevantes
  - `Generado: <timestamp>`
  - `Ref: <trace_ref>`
- Detalles sanitizados (sin secretos/tokens/api keys).

## Workflow
1. Detectar intencion `admin.health` por routing OpenClaw o fallback deterministico.
2. Ejecutar healthcheck read-only reutilizando fuente canonica.
3. Mapear estados tecnicos a salida admin (`ok|degraded|error`).
4. Sanitizar detalles sensibles.
5. Responder formato resumido con `Ref`.

## Safety Constraints
- Nunca ejecutar mutaciones.
- No revelar credenciales, tokens, secrets o stack traces.
- En fallo controlado, responder con mensaje seguro y `Ref`.

## Common Mistakes
- Mezclar esta ruta con `order.status`.
- Exponer valores sensibles en `detail`.
- Omitir `trace_ref` en exito o error.

---
name: admin.config.view
description: Use when admin asks to inspect runtime configuration safely in read-only mode with sanitized output and trace reference.
---

# skill: admin.config.view

## Overview
Consulta configuracion operativa del bot en modo read-only y responde snapshot sanitizado (flags/booleans/counts/limites), sin revelar secretos.

## When To Use
- El admin pide ver configuracion/ajustes/settings del bot o sistema.
- Ejemplos: `configuracion del bot`, `admin config`, `ver settings del sistema`.
- Se requiere diagnostico de estado de configuracion sin mutaciones.

## When Not To Use
- Cambios de configuracion o allowlist.
- Consulta de salud (`admin.health`) o logs (`admin.logs`).
- Mutaciones de negocio (pedido/pago/inventario/web).

## Input Contract
- Texto libre con intencion admin de configuracion.
- No requiere payload estructurado adicional.

## Output Contract
- Respuesta textual con resumen sanitizado por secciones (runtime/openclaw/telegram/connectors/web/crg).
- Incluye `Generado: <timestamp>` y `Ref: <trace_ref>`.
- Solo expone valores seguros: booleans, counts, limites y flags operativos.

## Workflow
1. Detectar intent `admin.config.view` por routing OpenClaw o fallback deterministico.
2. Construir snapshot sanitizado desde `AppConfig`.
3. Formatear respuesta admin consistente y trazable.
4. En falla controlada, responder mensaje seguro con `Ref`.

## Safety Constraints
- No ejecutar mutaciones ni comandos externos.
- Nunca exponer tokens, api keys, IDs sensibles o rutas sensibles.
- Mantener mensaje de error controlado (sin stack traces).

## Common Mistakes
- Mostrar valores crudos de credenciales.
- Omitir `Ref` en exito/fallo.
- Mezclar esta ruta con `admin.health` o `admin.logs`.

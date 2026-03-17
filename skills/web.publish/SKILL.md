---
name: web.publish
description: Use when user requests website actions (crear, menu, publicar) and requires explicit confirm flow before connector mutation.
---

# skill: web.publish

## Overview
Ejecuta acciones web (`crear`, `menu`, `publicar`) para contenido/publicacion del sitio. Es una mutacion con confirmacion explicita y controles de seguridad/configuracion.

## When To Use
- El usuario pide crear contenido web inicial, actualizar menu o publicar.
- Hay intencion clara de accion `crear|menu|publicar`.
- Se necesita trazabilidad por `operation_id`.

## When Not To Use
- Consultas read-only de pedidos.
- Operaciones de inventario o pago.
- Cotizaciones (`quote.order`).

## Input Contract
- `payload` con:
  - `action`: `crear | menu | publicar`
  - `content` segun accion (si aplica)
- Minimos por accion:
  - `crear`: `businessName`, `whatsapp`
  - `menu`: al menos `menuItems` o `catalogItems`
  - `publicar`: snapshot previo o `content` explicito
- Ejemplos:
  - `web crear negocio: OpenClaw Bakery whatsapp: +52...`
  - `web menu {"content":{"menuItems":[...]}}`
  - `publicar sitio`

## Output Contract
- Antes de ejecutar: resumen de accion + `confirmar | cancelar`.
- Al confirmar: ejecucion de `publish-site` con detalle trazable.
- En `dryRun`, devolver resultado estructurado sin side effects externos.
- Errores deterministas para payload invalido, config faltante o fallas provider.

## Workflow
1. Detectar intencion `web` y resolver accion (`crear|menu|publicar`).
2. Validar contenido minimo por accion.
3. Registrar operacion en `pending_confirm`.
4. Mostrar resumen y esperar `confirmar|cancelar`.
5. En confirmacion, ejecutar connector `publish-site`.
6. Persistir resultado `executed|failed` con detalle saneado.

## Safety Constraints
- Nunca publicar sin confirmacion explicita.
- En modo live (`dryRun=false`), exigir credenciales/config validas.
- Aceptar solo URLs de imagen seguras (`https`) y dominios permitidos.
- No exponer tokens/secretos ni errores crudos del provider.

## Common Mistakes
- Intentar `publicar` sin contenido base disponible.
- Enviar payload incompleto para `crear` o `menu`.
- Tratar errores `4xx` deterministas como reintentos infinitos.

# Runbook - Web Publish (Netlify)

Status: MVP
Last Updated: 2026-03-06

Runbook operativo para publicar el sitio estatico en Netlify manteniendo el flujo actual:
- webhook local `web.publish`
- build desde `site/CONTENT.json`
- deploy por Netlify Deploy API

## Scope
- Publicar cambios de contenido web (`site/CONTENT.json`) a produccion.
- Verificar deploy exitoso y smoke funcional basico.
- Ejecutar rollback rapido ante regresion visual/funcional.

## Prerequisites
- Variables configuradas en `.env`:
  - `WEB_PUBLISH_DRY_RUN=0`
  - `WEB_PUBLISH_WEBHOOK_URL=http://127.0.0.1:8787/web/publish`
  - `WEB_PUBLISH_API_KEY=<secret>`
  - `WEB_LOCAL_PUBLISH_TARGET=netlify`
  - `NETLIFY_SITE_ID=<site_id>`
  - `NETLIFY_API_TOKEN=<token>`
  - `WEB_ROLLBACK_DRILL_CONFIRM=0` (guard de seguridad por default)
- Dependencias instaladas (`npm install`).
- `site/CONTENT.json` actualizado y validado.

## Standard Deploy Procedure
1. Iniciar webhook en modo Netlify:

```bash
npm run web:publish:webhook:netlify
```

2. Confirmar health del webhook (segunda terminal):

```bash
curl -fsS http://127.0.0.1:8787/health
```

3. Ejecutar publish content-driven:

```bash
WEB_PUBLISH_DRY_RUN=0 npm run web:publish
```

4. Confirmar resultado exitoso en log:
- Evento `web_publish_content_result`
- `ok: true`
- `deployUrl: https://<...>.netlify.app`

## Post-Deploy Verification Checklist
1. Abrir `deployUrl` reportada y validar carga HTTP 200.
2. Revisar visualmente home, seccion catalogo y seccion de contacto.
3. Validar CTA principal (WhatsApp) abre enlace correcto.
4. Confirmar que imagenes (`site/dist/assets/*`) cargan sin 404.
5. (Opcional) Ejecutar smoke UI:

```bash
npm run smoke:web:ui
```

## Rollback
### Option A: Netlify Deploy History (recomendada)
1. Abrir proyecto en Netlify (`Project -> Deploys`).
2. Seleccionar el ultimo deploy estable.
3. Publicarlo nuevamente como deploy actual.

### Option A2: Netlify API (automatizable)
1. Identificar `deploy_id` objetivo en historial:

```bash
curl -fsS -H "Authorization: Bearer $NETLIFY_API_TOKEN" \
  "https://api.netlify.com/api/v1/sites/$NETLIFY_SITE_ID/deploys?per_page=10"
```

2. Restaurar deploy:

```bash
curl -fsS -X POST -H "Authorization: Bearer $NETLIFY_API_TOKEN" \
  "https://api.netlify.com/api/v1/deploys/<deploy_id>/restore"
```

3. Verificar deploy publicado actual:

```bash
curl -fsS -H "Authorization: Bearer $NETLIFY_API_TOKEN" \
  "https://api.netlify.com/api/v1/sites/$NETLIFY_SITE_ID" | jq -r '.published_deploy.id, .published_deploy.deploy_ssl_url'
```

### Option A3: Script automatizado (uso manual bajo demanda)
1. Ejecutar drill con confirmacion explicita:

```bash
WEB_ROLLBACK_DRILL_CONFIRM=1 npm run web:rollback:drill
```

2. Opcionalmente forzar target o modo de restauracion:

```bash
WEB_ROLLBACK_DRILL_CONFIRM=1 \
WEB_ROLLBACK_DRILL_TARGET_DEPLOY_ID=<deploy_id> \
WEB_ROLLBACK_DRILL_RESTORE_MODE=latest \
npm run web:rollback:drill
```

3. Resultado esperado:
- Evento `web_rollback_drill_result` con `rollback.elapsedMs` y `rollforward.elapsedMs`.
- `rollforward.publishedDeployId` igual al deploy final objetivo (`original` o `latest`).

Uso recomendado (sin scheduler):
- Ejecutar cuando se roten tokens/permisos de Netlify.
- Ejecutar despues de cambios en scripts/config de publish/rollback.
- Ejecutar antes de ventanas de alto riesgo (campanas, cambios fuertes de contenido).

### Option B: Rollback por contenido en repo
1. Restaurar `site/CONTENT.json` a la version estable (commit/tag previo).
2. Repetir procedimiento de deploy estandar.
3. Verificar `deployUrl` y checklist post-deploy.

## Troubleshooting
- Si `web_publish_content_failed` muestra `web_publish_http_500...`:
  - Revisar log del webhook (terminal de `web:publish:webhook:netlify`) para `detail` real.
- Si aparece `netlify_http_401_*` o `netlify_http_403_*`:
  - Token invalido/sin permisos; regenerar `NETLIFY_API_TOKEN` y validar scope/team.
- Si aparece `netlify_http_404_*`:
  - `NETLIFY_SITE_ID` incorrecto o pertenece a otra cuenta/team.
- Si aparece `netlify_deploy_timeout`:
  - Incrementar `WEB_LOCAL_PUBLISH_NETLIFY_POLL_TIMEOUT_MS` y reintentar.
- Si aparece `local_publish_build_failed:*`:
  - Ejecutar `npm run web:build` manualmente y corregir error de build antes de publicar.

## Security Notes
- No compartir ni loggear `NETLIFY_API_TOKEN`.
- Mantener `WEB_PUBLISH_API_KEY` distinta por entorno.
- Rotar tokens al detectar exposicion accidental.

## Drill Evidence
Simulacro real ejecutado el `2026-03-05` (Netlify API):
- `rollback` (restore a deploy previo): HTTP 200, `~0.88s` (`~894 ms` end-to-end).
- `roll-forward` (restore al deploy original): HTTP 200, `~0.90s` (`~913 ms` end-to-end).
- Verificacion: `published_deploy.id` cambio en ambos pasos y regreso al estado inicial al finalizar.
- Cierre operativo: sitio re-publicado en el deploy mas reciente (`69aa01524b7572e328109d41`).

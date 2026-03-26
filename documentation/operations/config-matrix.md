# Bot Bakery Configuration Matrix

Status: MVP
Last Updated: 2026-03-26

This matrix documents environment variables, defaults, requiredness, and runtime impact.

## Parsing and defaults
- Integer parsing uses positive integer fallback behavior.
- Retry counters use non-negative integer fallback behavior.
- Boolean feature flags are enabled only when value is exactly `"1"`.
- Unknown `CHANNEL_MODE` falls back to `console`.

## Environment Variables

| Variable | Default | Required | Used by | Effect |
|---|---|---|---|---|
| `NODE_ENV` | `development` | No | `src/config/appConfig.ts` | Runtime environment tag used in config/health context. |
| `LOG_LEVEL` | `info` | No | `src/index.ts` | Pino log level. |
| `TIMEZONE` | `America/Mexico_City` | No | `src/config/appConfig.ts`, health output | Default business timezone reference. |
| `DEFAULT_CURRENCY` | `MXN` | No | `src/config/appConfig.ts` | Default currency for normalization/presentation paths. |
| `ALLOWLIST_CHAT_IDS` | _(empty)_ | Recommended | allowlist guard, runtime | Authorized chat IDs (comma-separated); empty means deny-by-default warning. |
| `LOCAL_CHAT_ID` | `local-dev` | No | console channel | Chat ID used by console adapter. |
| `CHANNEL_MODE` | `console` | No | channel factory | `console` or `telegram`. Unknown -> `console`. |
| `RATE_LIMIT_ENABLE` | `1` | No | rate limit guard, healthcheck | Enables per-chat rate limiting (`1`=on, `0`=off). |
| `RATE_LIMIT_WINDOW_SECONDS` | `10` | No | rate limit guard | Sliding window duration (seconds). |
| `RATE_LIMIT_MAX_MESSAGES` | `8` | No | rate limit guard | Max messages per chat inside the window before temporary block. |
| `RATE_LIMIT_BLOCK_SECONDS` | `30` | No | rate limit guard | Temporary block duration after burst detection. |
| `EXPENSE_TOOL_DRY_RUN` | `1` | No | expense adapter, runtime | Safe default mode: no external write when enabled. |
| `EXPENSE_SHEETS_PROVIDER` | `gws` | No | expense adapter, healthcheck | Fixed provider for Sheets writes (`gws`). Other values are ignored/fallback to `gws`. |
| `EXPENSE_GWS_COMMAND` | `gws` | No | expense adapter, healthcheck | Binary used to invoke `googleworkspace/cli` command path. |
| `EXPENSE_GWS_COMMAND_ARGS` | _(unset)_ | No | expense adapter | Comma-separated prefix args injected before Sheets subcommand. |
| `EXPENSE_GWS_SPREADSHEET_ID` | _(unset)_ | Required when `EXPENSE_TOOL_DRY_RUN=0` | expense adapter, healthcheck | Target spreadsheet id for expense row append. |
| `EXPENSE_GWS_RANGE` | _(unset)_ | Required when `EXPENSE_TOOL_DRY_RUN=0` | expense adapter, healthcheck | Target A1 range for append (e.g. `Gastos!A1`). |
| `EXPENSE_GWS_VALUE_INPUT_OPTION` | `USER_ENTERED` | No | expense adapter | Sheets `valueInputOption` (`USER_ENTERED` or `RAW`). |
| `EXPENSE_TOOL_TIMEOUT_MS` | `5000` | No | expense adapter | HTTP timeout per connector attempt. |
| `EXPENSE_TOOL_MAX_RETRIES` | `2` | No | expense adapter | Bounded retry count for transient errors. |
| `ORDER_TRELLO_DRY_RUN` | `1` | No | order Trello adapter, healthcheck | Safe default mode for `create-card`; no Trello write when enabled. |
| `ORDER_TRELLO_API_KEY` | _(unset)_ | Required when `ORDER_TRELLO_DRY_RUN=0` | order Trello adapter, healthcheck | Trello API key for `create-card` live mode. |
| `ORDER_TRELLO_TOKEN` | _(unset)_ | Required when `ORDER_TRELLO_DRY_RUN=0` | order Trello adapter, healthcheck | Trello token for `create-card` live mode. |
| `ORDER_TRELLO_LIST_ID` | _(unset)_ | Required when `ORDER_TRELLO_DRY_RUN=0` | order Trello adapter, healthcheck | Target Trello list ID for active order cards. |
| `ORDER_TRELLO_CANCEL_LIST_ID` | _(unset)_ | Required when `ORDER_TRELLO_DRY_RUN=0` | order Trello adapter, healthcheck | Target Trello list ID for canceled orders (`order.cancel`). |
| `ORDER_TRELLO_API_BASE_URL` | `https://api.trello.com` | No | order Trello adapter | Trello API base URL. |
| `ORDER_TRELLO_TIMEOUT_MS` | `5000` | No | order Trello adapter | HTTP timeout per Trello request attempt. |
| `ORDER_TRELLO_MAX_RETRIES` | `2` | No | order Trello adapter | Bounded retry count for transient Trello errors. |
| `ORDER_SHEETS_DRY_RUN` | `1` | No | order Sheets adapter, healthcheck | Safe default mode for `append-order`; no external write when enabled. |
| `ORDER_SHEETS_PROVIDER` | `gws` | No | order Sheets adapter, healthcheck | Fixed provider for Sheets writes (`gws`). Other values are ignored/fallback to `gws`. |
| `ORDER_SHEETS_GWS_COMMAND` | `gws` | No | order Sheets adapter, healthcheck | Binary used to invoke `googleworkspace/cli` command path. |
| `ORDER_SHEETS_GWS_COMMAND_ARGS` | _(unset)_ | No | order Sheets adapter | Comma-separated prefix args injected before Sheets subcommand. |
| `ORDER_SHEETS_GWS_SPREADSHEET_ID` | _(unset)_ | Required when `ORDER_SHEETS_DRY_RUN=0` | order Sheets adapter, healthcheck | Target spreadsheet id for order row append. |
| `ORDER_SHEETS_GWS_RANGE` | _(unset)_ | Required when `ORDER_SHEETS_DRY_RUN=0` | order Sheets adapter, healthcheck | Target A1 range for append (e.g. `Pedidos!A1`). |
| `ORDER_SHEETS_GWS_VALUE_INPUT_OPTION` | `USER_ENTERED` | No | order Sheets adapter | Sheets `valueInputOption` (`USER_ENTERED` or `RAW`). |
| `ORDER_SHEETS_TIMEOUT_MS` | `5000` | No | order Sheets adapter | HTTP timeout per order Sheets request attempt. |
| `ORDER_SHEETS_MAX_RETRIES` | `2` | No | order Sheets adapter | Bounded retry count for transient order Sheets errors. |
| `ORDER_LOOKUP_LIMIT` | `10` | No | order lookup tool (`order.lookup`) | Max rows returned in `orders[]` preview for lookup replies; `total` still reflects full matches before truncation. |
| `ORDER_STATUS_LIMIT` | `10` | No | order status tool (`order.status`) | Max rows returned in `orders[]` preview for status replies; `total` still reflects full matches before truncation. |
| `ORDER_REPORT_LIMIT` | `10` | No | order report tool (`report.orders`) | Max rows returned in `orders[]` preview for report replies; `total` remains full count of valid rows for the selected period. |
| `ORDER_RECIPES_SOURCE` | `inline` | No | shopping list tool | Source for recipe profiles used by `shopping.list.generate`: `inline` or `gws`. |
| `ORDER_RECIPES_GWS_COMMAND` | fallback `ORDER_SHEETS_GWS_COMMAND` | No | shopping list tool | Binary used for recipe catalog reads when `ORDER_RECIPES_SOURCE=gws`. |
| `ORDER_RECIPES_GWS_COMMAND_ARGS` | fallback `ORDER_SHEETS_GWS_COMMAND_ARGS` | No | shopping list tool | Comma-separated prefix args injected before Sheets read commands for recipes catalog. |
| `ORDER_RECIPES_GWS_SPREADSHEET_ID` | fallback `ORDER_SHEETS_GWS_SPREADSHEET_ID` | Recommended when `ORDER_RECIPES_SOURCE=gws` | shopping list tool | Spreadsheet id containing recipes catalog tab (`CatalogoRecetas`). |
| `ORDER_RECIPES_GWS_RANGE` | `CatalogoRecetas!A:F` | No | shopping list tool | Read range for recipes catalog rows (`recipe_id, aliases_csv, insumo, unidad, cantidad_por_unidad, activo`). |
| `ORDER_RECIPES_TIMEOUT_MS` | fallback `ORDER_SHEETS_TIMEOUT_MS` | No | shopping list tool | Timeout per recipe catalog read attempt. |
| `ORDER_RECIPES_MAX_RETRIES` | fallback `ORDER_SHEETS_MAX_RETRIES` | No | shopping list tool | Bounded retry count for transient recipe catalog read failures. |
| `RECIPES_CATALOG_APPLY` | `0` | No | `scripts/sheets/init-recipes-catalog-tab.ts` | Safety gate: `0` preview only, `1` applies changes in Google Sheets. |
| `RECIPES_CATALOG_OVERWRITE` | `0` | No | `scripts/sheets/init-recipes-catalog-tab.ts` | When tab already has data, allows overwrite (`1`) instead of safe skip. |
| `RECIPES_CATALOG_TAB_NAME` | `CatalogoRecetas` | No | `scripts/sheets/init-recipes-catalog-tab.ts` | Title of the recipes catalog tab to create/update. |
| `RECIPES_CATALOG_GWS_SPREADSHEET_ID` | fallback `ORDER_RECIPES_GWS_SPREADSHEET_ID` then `ORDER_SHEETS_GWS_SPREADSHEET_ID` | Recommended | `scripts/sheets/init-recipes-catalog-tab.ts` | Spreadsheet id for recipes catalog bootstrap. |
| `RECIPES_CATALOG_GWS_COMMAND` | fallback `ORDER_RECIPES_GWS_COMMAND` | No | `scripts/sheets/init-recipes-catalog-tab.ts` | Binary used to invoke `googleworkspace/cli` for recipes catalog bootstrap. |
| `RECIPES_CATALOG_GWS_COMMAND_ARGS` | fallback `ORDER_RECIPES_GWS_COMMAND_ARGS` | No | `scripts/sheets/init-recipes-catalog-tab.ts` | Comma-separated prefix args injected before Sheets subcommands. |
| `RECIPES_CATALOG_GWS_VALUE_INPUT_OPTION` | `USER_ENTERED` | No | `scripts/sheets/init-recipes-catalog-tab.ts` | `valueInputOption` for `values.update` (`USER_ENTERED` or `RAW`). |
| `RECIPES_CATALOG_TIMEOUT_MS` | fallback `ORDER_RECIPES_TIMEOUT_MS` | No | `scripts/sheets/init-recipes-catalog-tab.ts` | Timeout per `gws` command invocation for recipes bootstrap. |
| `INVENTORY_TABS_APPLY` | `0` | No | `scripts/sheets/init-inventory-tabs.ts` | Safety gate: `0` preview only, `1` applies changes in Google Sheets. |
| `INVENTORY_TABS_OVERWRITE` | `0` | No | `scripts/sheets/init-inventory-tabs.ts` | When tab already has data, allows overwrite of headers (`1`) instead of safe skip. |
| `INVENTORY_TAB_NAME` | `Inventario` | No | `scripts/sheets/init-inventory-tabs.ts` | Title of inventory snapshot tab to create/update. |
| `INVENTORY_MOVEMENTS_TAB_NAME` | `MovimientosInventario` | No | `scripts/sheets/init-inventory-tabs.ts` | Title of inventory movements/audit tab to create/update. |
| `INVENTORY_GWS_SPREADSHEET_ID` | fallback `ORDER_SHEETS_GWS_SPREADSHEET_ID` | Recommended | `scripts/sheets/init-inventory-tabs.ts` | Spreadsheet id for inventory tabs bootstrap. |
| `INVENTORY_GWS_COMMAND` | fallback `ORDER_SHEETS_GWS_COMMAND` | No | `scripts/sheets/init-inventory-tabs.ts` | Binary used to invoke `googleworkspace/cli` for inventory tabs bootstrap. |
| `INVENTORY_GWS_COMMAND_ARGS` | fallback `ORDER_SHEETS_GWS_COMMAND_ARGS` | No | `scripts/sheets/init-inventory-tabs.ts` | Comma-separated prefix args injected before Sheets subcommands. |
| `INVENTORY_GWS_VALUE_INPUT_OPTION` | fallback `ORDER_SHEETS_GWS_VALUE_INPUT_OPTION` | No | `scripts/sheets/init-inventory-tabs.ts` | `valueInputOption` for headers update (`USER_ENTERED` or `RAW`). |
| `INVENTORY_TIMEOUT_MS` | fallback `ORDER_SHEETS_TIMEOUT_MS` | No | `scripts/sheets/init-inventory-tabs.ts` | Timeout per `gws` command invocation for inventory tabs bootstrap. |
| `SHEETS_SCHEMA_PATH` | _(unset)_ | Required for generic schema bootstrap | `scripts/sheets/init-sheet-tabs-from-schema.ts` | Path to tabs schema JSON file (`scripts/sheets/schemas/*.tabs.json`). |
| `SHEETS_SCHEMA_APPLY` | `0` | No | `scripts/sheets/init-sheet-tabs-from-schema.ts` | Generic safety gate: `0` preview only, `1` applies changes in Google Sheets. |
| `SHEETS_SCHEMA_OVERWRITE` | `0` | No | `scripts/sheets/init-sheet-tabs-from-schema.ts` | Generic overwrite flag for existing tab data. |
| `SHEETS_SCHEMA_GWS_SPREADSHEET_ID` | fallback `ORDER_SHEETS_GWS_SPREADSHEET_ID` | Recommended | `scripts/sheets/init-sheet-tabs-from-schema.ts` | Spreadsheet id target for generic schema bootstrap. |
| `SHEETS_SCHEMA_GWS_COMMAND` | fallback `ORDER_SHEETS_GWS_COMMAND` | No | `scripts/sheets/init-sheet-tabs-from-schema.ts` | Binary used to invoke `googleworkspace/cli` in generic schema mode. |
| `SHEETS_SCHEMA_GWS_COMMAND_ARGS` | fallback `ORDER_SHEETS_GWS_COMMAND_ARGS` | No | `scripts/sheets/init-sheet-tabs-from-schema.ts` | Comma-separated prefix args injected before Sheets subcommands in generic schema mode. |
| `SHEETS_SCHEMA_GWS_VALUE_INPUT_OPTION` | fallback `ORDER_SHEETS_GWS_VALUE_INPUT_OPTION` | No | `scripts/sheets/init-sheet-tabs-from-schema.ts` | Generic `valueInputOption` for `values.update` (`USER_ENTERED` or `RAW`). |
| `SHEETS_SCHEMA_TIMEOUT_MS` | fallback `ORDER_SHEETS_TIMEOUT_MS` | No | `scripts/sheets/init-sheet-tabs-from-schema.ts` | Timeout per `gws` command invocation for generic schema bootstrap. |
| `PRICING_CATALOG_APPLY` | `0` | No | `scripts/sheets/init-pricing-catalog-tab.ts` | Safety gate: `0` preview only, `1` applies changes in Google Sheets. |
| `PRICING_CATALOG_OVERWRITE` | `0` | No | `scripts/sheets/init-pricing-catalog-tab.ts` | When tab already has data, allows overwrite (`1`) instead of safe skip. |
| `PRICING_CATALOG_TAB_NAME` | `CatalogoPrecios` | No | `scripts/sheets/init-pricing-catalog-tab.ts` | Title of the pricing catalog tab to create/update. |
| `PRICING_CATALOG_GWS_SPREADSHEET_ID` | fallback `ORDER_SHEETS_GWS_SPREADSHEET_ID` | Recommended | `scripts/sheets/init-pricing-catalog-tab.ts` | Spreadsheet id for pricing catalog bootstrap. |
| `PRICING_CATALOG_GWS_COMMAND` | fallback `ORDER_SHEETS_GWS_COMMAND` | No | `scripts/sheets/init-pricing-catalog-tab.ts` | Binary used to invoke `googleworkspace/cli` for pricing catalog bootstrap. |
| `PRICING_CATALOG_GWS_COMMAND_ARGS` | fallback `ORDER_SHEETS_GWS_COMMAND_ARGS` | No | `scripts/sheets/init-pricing-catalog-tab.ts` | Comma-separated prefix args injected before Sheets subcommands. |
| `PRICING_CATALOG_GWS_VALUE_INPUT_OPTION` | fallback `ORDER_SHEETS_GWS_VALUE_INPUT_OPTION` | No | `scripts/sheets/init-pricing-catalog-tab.ts` | `valueInputOption` for `values.update` (`USER_ENTERED` or `RAW`). |
| `PRICING_CATALOG_TIMEOUT_MS` | fallback `ORDER_SHEETS_TIMEOUT_MS` | No | `scripts/sheets/init-pricing-catalog-tab.ts` | Timeout per `gws` command invocation for pricing bootstrap. |
| `WEB_PUBLISH_DRY_RUN` | `1` | No | web publish adapter, healthcheck | Safe default mode for `web.publish`; no external publish when enabled. |
| `WEB_CHAT_ENABLE` | `0` | No | conversation runtime, healthcheck | Enables `web` commands through chat runtime (`1`=enabled, `0`=disabled). Security-first default is disabled. |
| `WEB_CONTENT_PATH` | `site/CONTENT.json` | No | terminal/CI publish script, healthcheck | Repository path for canonical website content JSON. |
| `WEB_CONTENT_SYNC_PREVIEW` | `0` | No | `scripts/web/sync-content-from-sheets.ts` | Safety gate for content sync (`1` preview/no write, `0` apply/write outputs). |
| `WEB_CONTENT_SYNC_MOCK_JSON_PATH` | _(unset)_ | No | `scripts/web/sync-content-from-sheets.ts` | Optional local mock source (`{ "tabs": { "<tab>": [["h1"],["v1"]] } }`) to run sync without live Sheets access. |
| `WEB_CONTENT_SYNC_GWS_COMMAND` | fallback `ORDER_SHEETS_GWS_COMMAND` | No | `scripts/web/sync-content-from-sheets.ts` | Binary used to invoke `googleworkspace/cli` for web-content reads. |
| `WEB_CONTENT_SYNC_GWS_COMMAND_ARGS` | fallback `ORDER_SHEETS_GWS_COMMAND_ARGS` | No | `scripts/web/sync-content-from-sheets.ts` | Comma-separated prefix args injected before Sheets read subcommands. |
| `WEB_CONTENT_SYNC_GWS_SPREADSHEET_ID` | fallback `ORDER_SHEETS_GWS_SPREADSHEET_ID`, then `EXPENSE_GWS_SPREADSHEET_ID` | Recommended | `scripts/web/sync-content-from-sheets.ts` | Spreadsheet id containing web-content tabs (`productos`, `favoritos_inicio`, etc.). |
| `WEB_CONTENT_SYNC_TIMEOUT_MS` | fallback `ORDER_SHEETS_TIMEOUT_MS` | No | `scripts/web/sync-content-from-sheets.ts` | Timeout per `gws` command invocation for web-content sync reads. |
| `WEB_CONTENT_SYNC_TAB_PRODUCTOS` | `productos` | No | `scripts/web/sync-content-from-sheets.ts` | Tab name for product catalog rows. |
| `WEB_CONTENT_SYNC_TAB_FAVORITOS` | `favoritos_inicio` | No | `scripts/web/sync-content-from-sheets.ts` | Tab name for home favorites rows. |
| `WEB_CONTENT_SYNC_TAB_PASOS` | `pasos_compra` | No | `scripts/web/sync-content-from-sheets.ts` | Tab name for ordering steps rows. |
| `WEB_CONTENT_SYNC_TAB_RESENAS` | `resenas` | No | `scripts/web/sync-content-from-sheets.ts` | Tab name for testimonials/reviews rows. |
| `WEB_CONTENT_SYNC_TAB_RECURSOS` | `recursos` | No | `scripts/web/sync-content-from-sheets.ts` | Tab name for brand/media resources rows. |
| `WEB_CONTENT_SYNC_TAB_CONFIGURACION` | `configuracion_sitio` | No | `scripts/web/sync-content-from-sheets.ts` | Tab name for SEO/contact/site configuration rows. |
| `WEB_CONTENT_SYNC_OUTPUT_PATH` | fallback `WEB_CONTENT_PATH` | No | `scripts/web/sync-content-from-sheets.ts` | Target JSON path for canonical web content output. |
| `WEB_CONTENT_SYNC_ASTRO_OUTPUT_PATH` | `site-new-astro/src/data/site-content.generated.json` | No | `scripts/web/sync-content-from-sheets.ts` | Target JSON path consumed by Astro pages. |
| `WEB_PUBLISH_WEBHOOK_URL` | _(unset)_ | Required when `WEB_PUBLISH_DRY_RUN=0` | web publish adapter, healthcheck | Publish endpoint URL for `web.publish` live mode. |
| `WEB_PUBLISH_API_KEY` | _(unset)_ | Required when `WEB_PUBLISH_DRY_RUN=0` | web publish adapter, healthcheck | Shared secret sent to publish endpoint for authentication. |
| `WEB_PUBLISH_API_KEY_HEADER` | `x-api-key` | No | web publish adapter | Header name used to send publish API key. |
| `WEB_PUBLISH_TIMEOUT_MS` | `5000` | No | web publish adapter | HTTP timeout per publish request attempt. |
| `WEB_PUBLISH_MAX_RETRIES` | `2` | No | web publish adapter | Bounded retry count for transient publish errors. |
| `WEB_PUBLISH_INCLUDE_CONTENT` | `0` when `WEB_PUBLISH_ACTION=publicar`, otherwise `1` | No | `scripts/web/publish-site-from-content.ts` | Controls whether `web:publish` sends full `content` payload to webhook. |
| `WEB_LOCAL_PUBLISH_HOST` | `127.0.0.1` | No | `scripts/web/local-publish-webhook.ts` | Host bind for local Node webhook used in controlled validation. |
| `WEB_LOCAL_PUBLISH_PORT` | `8787` | No | `scripts/web/local-publish-webhook.ts` | Port bind for local Node webhook. |
| `WEB_LOCAL_PUBLISH_PATH` | `/web/publish` | No | `scripts/web/local-publish-webhook.ts` | Route path for local publish webhook endpoint. |
| `WEB_LOCAL_PUBLISH_API_KEY` | fallback `WEB_PUBLISH_API_KEY` | Recommended | `scripts/web/local-publish-webhook.ts` | Local shared secret validated against header/body API key. |
| `WEB_LOCAL_PUBLISH_TARGET` | `local` | No | `scripts/web/local-publish-webhook.ts` | Publish target for local webhook: `local` (default) or `netlify`. |
| `WEB_LOCAL_PUBLISH_CONTENT_PATH` | fallback `WEB_CONTENT_PATH` | No | `scripts/web/local-publish-webhook.ts` | Content JSON path updated by local webhook before build. |
| `WEB_LOCAL_PUBLISH_DIST_PATH` | `site/dist` | No | `scripts/web/local-publish-webhook.ts` | Built static directory uploaded when target is Netlify. |
| `WEB_LOCAL_PUBLISH_BUILD_TIMEOUT_MS` | `20000` | No | `scripts/web/local-publish-webhook.ts` | Max time allowed for local `web:build` execution. |
| `NETLIFY_SITE_ID` | _(unset)_ | Required when `WEB_LOCAL_PUBLISH_TARGET=netlify` | `scripts/web/local-publish-webhook.ts` | Netlify site id used for Deploy API calls. |
| `NETLIFY_API_TOKEN` | _(unset)_ | Required when `WEB_LOCAL_PUBLISH_TARGET=netlify` | `scripts/web/local-publish-webhook.ts` | Netlify personal access token (`Bearer`) used for deploy/upload/poll requests. |
| `WEB_LOCAL_PUBLISH_NETLIFY_API_BASE_URL` | `https://api.netlify.com/api/v1` | No | `scripts/web/local-publish-webhook.ts` | Netlify API base URL for Deploy API operations. |
| `WEB_LOCAL_PUBLISH_NETLIFY_POLL_TIMEOUT_MS` | `120000` | No | `scripts/web/local-publish-webhook.ts` | Max wait time for deploy status to reach `ready`. |
| `WEB_LOCAL_PUBLISH_NETLIFY_POLL_INTERVAL_MS` | `2000` | No | `scripts/web/local-publish-webhook.ts` | Poll interval for deploy status checks. |
| `WEB_ROLLBACK_DRILL_CONFIRM` | `0` | Required to execute drill (`1`) | `scripts/web/netlify-rollback-drill.ts` | Safety guard; prevents rollback drill execution unless explicitly enabled. |
| `WEB_ROLLBACK_DRILL_PER_PAGE` | `10` | No | `scripts/web/netlify-rollback-drill.ts` | Number of recent deploys fetched when selecting rollback target. |
| `WEB_ROLLBACK_DRILL_RESTORE_MODE` | `original` | No | `scripts/web/netlify-rollback-drill.ts` | Final restore target after drill: `original` or `latest`. |
| `WEB_ROLLBACK_DRILL_TARGET_DEPLOY_ID` | _(unset)_ | No | `scripts/web/netlify-rollback-drill.ts` | Optional explicit deploy id to use as rollback target. |
| `WEB_PUBLISH_ALLOWED_IMAGE_DOMAINS` | `facebook.com,fbcdn.net` | No | web publish adapter, healthcheck | Approved image host domains for catalog/gallery URLs (`https` only). |
| `WEB_FACEBOOK_PAGE_URL` | _(unset)_ | Conditionally required | web publish adapter | Business Facebook page scope used when catalog items use `imageSource=facebook`. |
| `TELEGRAM_BOT_TOKEN` | _(none)_ | Required when `CHANNEL_MODE=telegram` | telegram channel | Bot auth token; missing token causes channel startup failure. |
| `TELEGRAM_API_BASE_URL` | `https://api.telegram.org` | No | telegram channel | Telegram base URL. |
| `TELEGRAM_POLL_INTERVAL_MS` | `1000` | No | telegram channel | Delay between poll iterations. |
| `TELEGRAM_LONG_POLL_TIMEOUT_SECONDS` | `25` | No | telegram channel | Long-poll timeout for `getUpdates`. |
| `OPENCLAW_ENABLE` | `0` | No | openclaw runtime | Enables OpenClaw invocation path. |
| `OPENCLAW_AGENT_ID` | `main` | No | openclaw runtime | Agent identifier passed to OpenClaw CLI. |
| `OPENCLAW_PROFILE` | _(unset)_ | No | openclaw runtime | Optional OpenClaw profile selection. |
| `OPENCLAW_TIMEOUT_SECONDS` | `30` | No | openclaw runtime | OpenClaw invocation timeout. |
| `OPENCLAW_THINKING` | _(unset)_ | No | openclaw runtime | Optional OpenClaw thinking mode. |
| `OPENCLAW_READONLY_ROUTING_ENABLE` | `0` | No | conversation runtime | Enables OpenClaw-first routing/extraction for read-only intents (`report/orders`, `lookup`, `status`, `schedule`, `shopping`, `quote`). |
| `OPENCLAW_READONLY_QUOTE_ENABLE` | `1` | No | conversation runtime | Controls whether `quote.order` is included in OpenClaw read-only routing when `OPENCLAW_READONLY_ROUTING_ENABLE=1`. |
| `OPENCLAW_STRICT` | `0` | No | conversation runtime | Enables strict runtime mode traces/behavior gates. |
| `OPENCLAW_STRICT_SOFTFAIL` | `0` | No | failover behavior | Allows fallback on transient OpenClaw failures. |
| `OPENCLAW_BIN` | `npx` | No | openclaw runtime | Binary used to invoke OpenClaw CLI. |
| `BOT_DB_PATH` | `bot.db` | No | sqlite database init, healthcheck | SQLite file location. |
| `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` | _(unset)_ | No | `scripts/smoke/web-ui-playwright-smoke.ts` | Ruta local explicita de Chromium para smoke UI cuando no hay browser de Playwright instalado. |
| `PLAYWRIGHT_BROWSERS_PATH` | cache Playwright por usuario | No | Playwright CLI + smoke UI | Ubicacion de cache/instalacion de navegadores Playwright. |
| `WEB_UI_SMOKE_HEADLESS` | `1` | No | `scripts/smoke/web-ui-playwright-smoke.ts` | Ejecuta browser en headless (`1`) o visible (`0`). |
| `WEB_UI_SMOKE_SCREENSHOTS` | `0` | No | `scripts/smoke/web-ui-playwright-smoke.ts` | Guarda capturas `desktop.png`/`mobile.png` en `site/dist/.smoke` cuando vale `1`. |
| `WEB_UI_SMOKE_SKIP_BROWSER` | `0` | No | `scripts/smoke/web-ui-playwright-smoke.ts` | Modo fallback sin browser; valida solo que `site/dist` exista. |

## Healthcheck relevance
`npm run healthcheck` validates operational readiness using:
- channel configuration
- allowlist size
- rate limit policy status
- expense connector readiness (dry-run + provider-specific config)
- order Trello connector readiness (dry-run/config + credentials)
- order Sheets connector readiness (dry-run + provider-specific config)
- web publish connector readiness (dry-run/config + API key + allowed image domains)
- web chat mode and content path
- sqlite open state
- OpenClaw runtime config
- expected skill paths
- tool skeleton presence

## Smoke Commands
- Dry-run smoke (safe default): `npm run smoke:expense`
- Live `gws` smoke attempt:
  - `EXPENSE_TOOL_DRY_RUN=0 EXPENSE_GWS_SPREADSHEET_ID=<id> EXPENSE_GWS_RANGE=Gastos!A1 npm run smoke:expense`
- Dry-run order smoke (safe default): `npm run smoke:order`
- Live Trello+Sheets attempt:
  - `ORDER_TRELLO_DRY_RUN=0 ORDER_SHEETS_DRY_RUN=0 npm run smoke:order`
- Quote smoke (safe default, guided missing-data flow): `npm run smoke:quote`
- Quote smoke live against real pricing catalogs:
  - `SMOKE_QUOTE_LIVE=1 npm run smoke:quote`
- Full lifecycle smoke (`create -> update -> cancel`, with Trello+Sheets cross-validation):
  - Mock default: `npm run smoke:lifecycle`
  - Live: `SMOKE_LIFECYCLE_LIVE=1 SMOKE_LIFECYCLE_DRY_RUN=0 npm run smoke:lifecycle`
  - Optional strict create sync gate: `SMOKE_LIFECYCLE_STRICT_CREATE_SYNC=1` (fails if `create` does not persist `estado_pedido` and `trello_card_id` on first write).
- If live mode fails with `order_trello_api_key_missing`, `order_trello_token_missing`, `order_trello_list_id_missing`, or `order_trello_cancel_list_id_missing`, configure matching `ORDER_TRELLO_*` vars and retry.
- Live order `gws` smoke attempt:
  - `ORDER_TRELLO_DRY_RUN=0 ORDER_SHEETS_DRY_RUN=0 ORDER_SHEETS_GWS_SPREADSHEET_ID=<id> ORDER_SHEETS_GWS_RANGE=Pedidos!A1 npm run smoke:order`
- Pricing catalog tab bootstrap (safe preview):
  - `npm run sheets:pricing:preview`
- Pricing catalog tab bootstrap (raw command; honors `.env` apply/overwrite flags):
  - `npm run sheets:pricing:init`
- Pricing catalog tab bootstrap apply (creates tab + seed rows):
  - `PRICING_CATALOG_APPLY=1 npm run sheets:pricing:init`
- Pricing catalog overwrite (when tab already has data):
  - `PRICING_CATALOG_APPLY=1 PRICING_CATALOG_OVERWRITE=1 npm run sheets:pricing:init`
- Recipes catalog tab bootstrap (safe preview):
  - `npm run sheets:recipes:preview`
- Recipes catalog tab bootstrap (raw command; honors `.env` apply/overwrite flags):
  - `npm run sheets:recipes:init`
- Recipes catalog tab bootstrap apply (creates tab + seed rows):
  - `RECIPES_CATALOG_APPLY=1 npm run sheets:recipes:init`
- Recipes catalog overwrite (when tab already has data):
  - `RECIPES_CATALOG_APPLY=1 RECIPES_CATALOG_OVERWRITE=1 npm run sheets:recipes:init`
- Inventory tabs bootstrap (safe preview):
  - `npm run sheets:inventory:preview`
- Inventory tabs bootstrap (raw command; honors `.env` apply/overwrite flags):
  - `npm run sheets:inventory:init`
- Inventory tabs bootstrap apply (creates missing tabs + writes headers):
  - `INVENTORY_TABS_APPLY=1 npm run sheets:inventory:init`
- Inventory tabs overwrite headers (when tabs already have data):
  - `INVENTORY_TABS_APPLY=1 INVENTORY_TABS_OVERWRITE=1 npm run sheets:inventory:init`
- Generic schema bootstrap (preview):
  - `SHEETS_SCHEMA_PATH=scripts/sheets/schemas/inventory-tabs.tabs.json npm run sheets:tabs:init:schema`
- Generic schema bootstrap apply:
  - `SHEETS_SCHEMA_APPLY=1 SHEETS_SCHEMA_PATH=scripts/sheets/schemas/inventory-tabs.tabs.json npm run sheets:tabs:init:schema`
- Generic tabs schema validation (required before apply in CI/manual flow):
  - `npm run sheets:tabs:validate:schema`
- Web content tabs bootstrap (preview):
  - `npm run sheets:web-content:preview`
- Web content tabs bootstrap apply:
  - `SHEETS_SCHEMA_APPLY=1 npm run sheets:web-content:init`
- Pricing catalog tabs validation (headers + duplicate keys):
  - `npm run sheets:pricing:validate`
- Dry-run web smoke (safe default): `npm run smoke:web`
- Start local webhook for controlled live validation:
  - `WEB_LOCAL_PUBLISH_API_KEY=<secret> npm run web:publish:webhook:local`
- Live web smoke against local webhook:
  - `WEB_PUBLISH_DRY_RUN=0 WEB_PUBLISH_WEBHOOK_URL=http://127.0.0.1:8787/web/publish WEB_PUBLISH_API_KEY=<secret> npm run smoke:web`
- Start webhook in Netlify target mode (same flow, public deploy output):
  - `WEB_LOCAL_PUBLISH_TARGET=netlify NETLIFY_SITE_ID=<site_id> NETLIFY_API_TOKEN=<token> WEB_LOCAL_PUBLISH_API_KEY=<secret> npm run web:publish:webhook:netlify`
- Live content-driven publish to Netlify through the same webhook contract:
  - `WEB_PUBLISH_DRY_RUN=0 WEB_PUBLISH_WEBHOOK_URL=http://127.0.0.1:8787/web/publish WEB_PUBLISH_API_KEY=<secret> npm run web:publish`
- Rollback drill automatizado (safe-guard por confirmacion):
  - `WEB_ROLLBACK_DRILL_CONFIRM=1 npm run web:rollback:drill`
- UI smoke (Playwright-core, incluye `web:build`): `npm run smoke:web:ui`
- Build static site from repository content:
  - `npm run web:build`
- Sync web content from Sheets/mock to `site/CONTENT.json` + Astro data:
  - `npm run web:content:sync`
- Sync web content preview only (no writes):
  - `npm run web:content:sync:preview`
- Sync using local mock JSON (recommended for dry validation):
  - `WEB_CONTENT_SYNC_MOCK_JSON_PATH=/tmp/web-content-tabs.mock.json npm run web:content:sync`
- One-command local preview (build + serve):
  - `npm run web:live:local`
- Import public Facebook image URLs into `site/CONTENT.json` gallery (best effort):
  - `npm run web:import:facebook`
- Dry-run Facebook import (no file write):
  - `WEB_FB_IMPORT_DRY_RUN=1 npm run web:import:facebook`
- Force page URL for import:
  - `WEB_FB_PAGE_URL=https://www.facebook.com/HadiCakess/ npm run web:import:facebook`
- Also map imported images to `catalogItems` with `imageSource=facebook` or missing image:
  - `WEB_FB_IMPORT_APPLY_TO_CATALOG=1 npm run web:import:facebook`
- Build output:
  - `site/dist/index.html`
  - `site/dist/styles.css`
  - `site/dist/content.snapshot.json`
  - `site/dist/assets/*` (copiado desde `site/assets` cuando exista)
- Live publish attempt:
  - `WEB_PUBLISH_DRY_RUN=0 npm run smoke:web`
- Content-driven publish from repository JSON (terminal/CI):
  - `npm run web:publish`
- Live content-driven publish:
  - `WEB_PUBLISH_DRY_RUN=0 npm run web:publish`
- Runbook operativo (deploy, verificacion y rollback):
  - `documentation/operations/runbooks/web-publish-netlify.md`
- Install Chromium for UI smoke (requires internet):
  - `PLAYWRIGHT_BROWSERS_PATH=.playwright-browsers node node_modules/playwright-core/cli.js install chromium`
- Use system Chromium in UI smoke:
  - `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/path/to/chromium npm run smoke:web:ui`
- Override content file path:
  - `WEB_CONTENT_PATH=site/CONTENT.json npm run web:publish`
- If live mode fails with `web_publish_webhook_url_missing` or `web_publish_api_key_missing`, configure `WEB_PUBLISH_WEBHOOK_URL` / `WEB_PUBLISH_API_KEY` and retry.
- If validation fails with `web_publish_image_domain_not_allowed`, add the image host to `WEB_PUBLISH_ALLOWED_IMAGE_DOMAINS`.
- If validation fails with `web_publish_facebook_page_scope_missing`, set `WEB_FACEBOOK_PAGE_URL` or pass `facebookPageUrl` in content.

## Integration Notes
- Google writes use `gws` only (`googleworkspace/cli` Sheets append/get/update); ensure host auth/session is configured before live mode.
- Pricing catalog bootstrap uses the same `gws` path and writes to a dedicated tab (default: `CatalogoPrecios`) in the configured spreadsheet.
- Recipes catalog bootstrap uses the same `gws` path and writes to a dedicated tab (default: `CatalogoRecetas`) in the configured spreadsheet.
- Inventory tabs bootstrap uses the same `gws` path and creates/updates `Inventario` + `MovimientosInventario` headers in the configured spreadsheet.
- Generic schema bootstrap (`sheets:tabs:init:schema`) provides a manifest-driven path for future tabs using `scripts/sheets/schemas/*.tabs.json`.
- Generic tabs schema validator (`sheets:tabs:validate:schema`) catches malformed manifest files (missing headers/tabs, duplicate keys/names, invalid row shapes/placeholders) before bootstrap.
- Web content sync consumes tabs en espanol (`productos`, `favoritos_inicio`, `pasos_compra`, `resenas`, `recursos`, `configuracion_sitio`) and writes both canonical JSON (`site/CONTENT.json`) and Astro generated JSON (`site-new-astro/src/data/site-content.generated.json`).
- `report.orders` reads Google Sheets via `gws` (`values.get`) using `ORDER_SHEETS_GWS_SPREADSHEET_ID` and a read range derived from `ORDER_SHEETS_GWS_RANGE` (`Pedidos!A1` -> `Pedidos!A:U`), preferring `fecha_hora_entrega_iso` for filtering when that column exists, exposing `trace_ref` and capping preview rows with `ORDER_REPORT_LIMIT`.
- `order.lookup` reads `Pedidos` via `gws` with the same spreadsheet/range base config and caps preview rows with `ORDER_LOOKUP_LIMIT` (default 10).
- `shopping.list.generate` reads orders from `Pedidos` via `gws` and resolves recipe profiles from `ORDER_RECIPES_SOURCE`:
  - `inline`: built-in defaults for smoke/mock.
  - `gws`: recipe rows from `CatalogoRecetas` (`ORDER_RECIPES_GWS_RANGE`, default `CatalogoRecetas!A:F`).
- Web publish adapter sanitizes media URLs by removing query/hash and only accepts `https` image URLs from approved domains.
- Chat-based `web` flow is disabled by default (`WEB_CHAT_ENABLE=0`); preferred operation mode is content-driven via repository + terminal/CI.
- Facebook import helper (`web:import:facebook`) only reads public page HTML and can fail due to anti-bot restrictions; manual image curation remains fallback.

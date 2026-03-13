# OpenClaw Bakery

Bot de operaciones para panaderia con runtime conversacional, integraciones (Sheets/Trello/web) y guardrails operativos.

## Quick Start
1. Instalar dependencias:
   - `npm ci`
2. Preparar entorno:
   - copiar `.env.example` a `.env`
   - completar variables segun `documentation/operations/config-matrix.md`
3. Ejecutar validaciones base:
   - `npm run security:scan`
   - `npm test`

## Security Scanning
- Working tree scan:
  - `npm run security:scan`
- Full git history scan (requires `gitleaks` installed locally):
  - `npm run security:scan:history`

## Sheets Catalog Bootstrap
- Pricing catalog (preview/apply):
  - `npm run sheets:pricing:preview`
  - `PRICING_CATALOG_APPLY=1 npm run sheets:pricing:init`
- Recipes catalog (preview/apply):
  - `npm run sheets:recipes:preview`
  - `RECIPES_CATALOG_APPLY=1 npm run sheets:recipes:init`
- Inventory tabs (preview/apply):
  - `npm run sheets:inventory:preview`
  - `INVENTORY_TABS_APPLY=1 npm run sheets:inventory:init`
- Generic schema-driven bootstrap:
  - `SHEETS_SCHEMA_PATH=scripts/sheets/schemas/inventory-tabs.tabs.json npm run sheets:tabs:init:schema`
- Schema files validation (`scripts/sheets/schemas/*.tabs.json`):
  - `npm run sheets:tabs:validate:schema`

## Repo Map
- Runtime: `src/runtime/`
- Guards: `src/guards/`
- Skills: `src/skills/`
- OpenClaw adapter: `src/openclaw/`
- State: `src/state/`
- Tools: `src/tools/`
- Channel adapters: `src/channel/`

## Collaboration
- Reglas operativas: `AGENTS.md`
- Playbook canonico: `documentation/ai_collaboration/codex-collaboration-playbook.md`
- System map: `documentation/ai_collaboration/system-map.md`
- Planes/handoffs: `documentation/ai_collaboration/plans/`

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

# Token-Efficient Session Checklist (Operational Template)

Status: Active
Last Updated: 2026-03-23

## Purpose
Plantilla reusable para ejecutar sesiones cortas con continuidad documental completa, sin romper el flujo canonico `Discover -> Specify -> Clarify -> Plan -> Tasks -> Implement -> Validate -> Close`.

## How To Use
1. Copiar esta checklist al inicio de una sesion compleja o multi-bloque.
2. Marcar solo lo que se complete de forma real en el bloque.
3. Al cerrar, reflejar el estado final en plan/index/handoff.

## Pre-Session Checklist
- [ ] Defini micro-objetivo unico y verificable para este bloque.
- [ ] Revise `AGENTS.md` y confirme gates aplicables (`apruebo`, plan, handoff).
- [ ] Revise `documentation/ai_collaboration/plans/_index.md`.
- [ ] Revise plan activo + ultimo handoff de la linea de trabajo.
- [ ] Limite alcance a rutas/archivos concretos para reducir exploracion.

## In-Session Checklist
- [ ] Mantuve foco en un solo objetivo principal.
- [ ] Evite exploracion amplia sin filtro (`rg -n`, `sed -n`, lecturas acotadas).
- [ ] Registre desvios como `follow-up` en vez de mezclar frentes nuevos.
- [ ] Mantuve cambios pequenos y verificables.

## Post-Session Checklist
- [ ] Actualice estado real del plan (`Not Started` / `In Progress` / `Complete`).
- [ ] Si cambio estado global, sincronice `plans/_index.md`.
- [ ] Escribi handoff corto con:
  - [ ] que se hizo
  - [ ] estado actual
  - [ ] riesgos/limitaciones
  - [ ] siguiente paso recomendado
- [ ] Reporte comandos de validacion ejecutados y limites de validacion.

## Suggested Handoff Stub
```md
## What Was Done
- ...

## Current State
- ...

## Open Issues
- ...

## Next Steps
1. ...
```

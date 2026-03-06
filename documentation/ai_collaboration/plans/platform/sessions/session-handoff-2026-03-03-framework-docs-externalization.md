# Session Handoff: Framework Docs Externalization - 2026-03-03

> **Plan:** `documentation/ai_collaboration/plans/platform/implementation/framework-docs-externalization.md`
> **Date:** `2026-03-03`
> **Owner:** `Codex + Dev`

## What Was Done
- Se externalizaron internamente los docs de framework reusable a `documentation/ai_collaboration/references/framework/`.
- Se dejaron stubs de compatibilidad en las rutas legacy para no romper enlaces.
- Se actualizaron hubs y reglas de IA documental para distinguir canon de producto vs framework reusable.
- Se actualizo referencia en `codex-collaboration-playbook.md` al nuevo path canonico.

## Current State
- Canon de producto mas limpio en `documentation/`.
- Framework reusable centralizado y listo para eventual migracion a repo externo.
- No hay planes activos en `_index.md`.

## Open Issues
- Falta ejecutar migracion al repo externo (si se decide).
- Falta automatizar link-check en CI para endurecer continuidad de enlaces.

## Next Steps
1. Definir destino externo (repo/playbook) y ownership de framework docs.
2. Cuando exista repo externo, convertir stubs a links externos estables.
3. Agregar link-check de Markdown en pipeline.

## Key Decisions
- Priorizar no-disruption con stubs en lugar de remocion directa.
- Mantener frameworks dentro de `ai_collaboration/references/` como etapa intermedia.

# Codex Local Rules

Estas reglas complementan `AGENTS.md` para acelerar desarrollo y reducir regresiones operativas.

## Rules Catalog
- `gws-only.md`: usar Google Workspace CLI como unica integracion de Sheets.
- `order-dual-write-strict.md`: consistencia obligatoria Trello + Sheets en mutaciones de pedidos.
- `live-flags-gate.md`: live tests/operaciones solo con flags explicitos.
- `mandatory-validation.md`: validacion minima segun el tipo de cambio.
- `intent-skill-coverage-gate.md`: cobertura obligatoria entre intents activos y skills funcionales en `skills/`.
- `intent-disambiguation-guard.md`: guard obligatorio de no-interferencia entre intents con vocabulario superpuesto.
- `mutation-clarification-flow-standard.md`: estandar obligatorio para aclaracion/desambiguacion en intents mutables con referencia o payload faltante.
- `read-only-clarification-flow-standard.md`: estandar obligatorio para pedir aclaracion en intents read-only con query faltante/ambigua.
- `secrets-never-commit.md`: manejo seguro de secretos y staging.
- `approval-keyword-gate.md`: implementar o commitear solo con confirmacion explicita que incluya `apruebo`.
- `documentation-validation-placeholder-filter.md`: en validaciones documentales, tratar placeholders (`...`, `*`, `<...>`) como no-bloqueantes para evitar falsos positivos.
- `read-only-trace-ref-standard.md`: estandar obligatorio de `Ref/trace_ref` para intents read-only (exito/no-encontrado/falla controlada).
- `read-only-partial-intervention-standard.md`: estandar obligatorio para exponer intervencion manual cuando intents read-only excluyen datos por calidad/fallback.
- `test-failure-priority-gate.md`: si fallan unit/smoke, el siguiente objetivo obligatorio es arreglar fallas; sin commit ni avance de feature.

## Usage
1. Aplicar estas reglas por defecto en cambios de bot/runtime.
2. Si alguna regla debe romperse por necesidad puntual, documentar la excepcion en plan/handoff.
3. Mantener estas reglas sincronizadas con specs C4 y flujos smoke/integration.

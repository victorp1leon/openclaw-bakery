# Release Process

Status: Draft
Last Updated: 2026-03-03

## Release Flow (Minimum)
1. Actualizar specs/docs de cambios funcionales y de seguridad.
2. Ejecutar `npm test` y `npm run verify:security`.
3. Revisar `documentation/governance/ai-risk-register.md`.
4. Confirmar trazabilidad en ADR/plan/handoff cuando aplique.
5. Publicar release notes en `release-notes/`.

## Do Not Release If
- Existen hallazgos criticos abiertos de seguridad.
- No hay evidencia de evaluacion AI para cambios de comportamiento.

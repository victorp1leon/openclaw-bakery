# AI Release Gates

Status: Draft
Last Updated: 2026-03-03

## Minimum Gate
1. Test suite `npm test` en verde.
2. `npm run verify:security` en verde.
3. Evidencia de evals offline actualizada.
4. Riesgos AI residuales documentados en `documentation/governance/ai-risk-register.md`.
5. Impacto de seguridad revisado contra `documentation/security/threat-model-stride.md`.

## Fail Criteria
- Hallazgo critico sin mitigacion documentada.
- Regresion funcional de guardrails.
- Logging de datos sensibles fuera de politica.

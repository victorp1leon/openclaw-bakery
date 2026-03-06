# Documentation Hub (AI-First, Security-First)

Status: In Progress
Last Updated: 2026-03-03

Esta carpeta usa un enfoque docs-as-code para un proyecto AI-first con seguridad como prioridad.

## Start Here
1. Onboarding: `getting-started/README.md`
2. Product context: `bot-bakery.overview.md`, `bot-bakery.roadmap.md`
3. Architecture: `architecture/README.md` (entry), `c4/README.md`, `adr/README.md`
4. AI system controls: `ai-system/README.md`
5. Operations: `operations/README.md`
6. Security: `security/README.md`
7. Governance and compliance: `governance/README.md`
8. Release readiness: `release/README.md`
9. AI collaboration process: `ai_collaboration/README.md`

## Documentation Standards Baseline
- Diataxis for navigation by doc intent.
- C4 + Specs for architecture and implementation contracts.
- ADR for architectural decision history.
- NIST AI RMF + NIST SSDF + OWASP LLM Top 10 as governance/security reference.

## Structure by Domain
- `getting-started/`: quick onboarding and deploy basics.
- `architecture/`: gateway to C4 and ADR.
- `ai-system/`: prompts, evals, model transparency, safety controls.
- `operations/`: config, runbooks, deployment, observability.
- `security/`: threat model and security policies.
- `governance/`: AI risk register and compliance mappings.
- `api/`: contracts and integration guides.
- `release/`: release process and evidence.
- `ai_collaboration/`: planning, session continuity, and reusable framework references.

## Product Canon vs Reusable Framework
- Product-canonical docs live in the main domains above.
- Reusable framework docs live in `ai_collaboration/references/framework/` and can be moved to an external playbook repository later.

## Publication Readiness (Minimum)
- Vulnerability disclosure policy published.
- AI risk register reviewed per release.
- AI eval gate evidence attached to release.
- Security docs aligned with current runtime behavior.

## Canonical Architecture Rules
1. If architecture changes: update `c4/` specs first, then code/tests.
2. If security posture changes: update `security/` plus validation evidence.
3. If operations change: update `operations/` runbooks and config matrix.
4. If work is complex: update plan/handoff in `ai_collaboration/plans/`.

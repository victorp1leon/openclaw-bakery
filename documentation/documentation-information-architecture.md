# Documentation Information Architecture

Status: In Progress
Last Updated: 2026-03-03

## Objective
Definir una arquitectura documental AI-first, auditable y publicable, sin perder continuidad para el equipo de desarrollo.

## Industry-Aligned Foundation
1. Diataxis: separar explanation, reference y how-to para mejorar discoverability.
2. C4 + Specs: arquitectura y contratos verificables.
3. ADR: historial de decisiones tecnicas.
4. Runbook-oriented operations: respuesta operacional repetible.
5. AI governance artifacts: riesgos, evals, gates y transparencia de modelo.

## Audience Routing
| Audiencia | Pregunta principal | Entry points |
|---|---|---|
| Product/Owner | que hace el sistema y que falta | `bot-bakery.overview.md`, `bot-bakery.roadmap.md`, `release/README.md` |
| Engineer | como esta construido y por que | `architecture/README.md`, `c4/README.md`, `adr/README.md` |
| Operator | como operar y recuperar | `operations/README.md`, `security/README.md` |
| AI collaborator | como mantener continuidad | `ai_collaboration/README.md`, `ai_collaboration/plans/_index.md` |
| Security/GRC | cuales riesgos quedan y que controles existen | `governance/README.md`, `security/README.md`, `ai-system/evals/release-gates.md` |

## Domain Model
- `getting-started/`: onboarding rapido.
- `architecture/`: navegacion principal hacia C4 y ADR.
- `ai-system/`: prompts, evals, model cards y controles AI.
- `operations/`: operacion diaria, despliegue y observabilidad.
- `security/`: threat model, logging policy y disclosure.
- `governance/`: risk register AI y mapeos de compliance.
- `api/`: contratos e integraciones.
- `release/`: proceso de release y evidencia.
- `ai_collaboration/`: planes, handoffs y referencias de framework reusable.

## Canonical Placement Policy
- Product docs: especifican comportamiento, arquitectura y operacion de OpenClaw Bakery.
- Framework docs: metodologias reutilizables y estructuras genericas; deben vivir en `ai_collaboration/references/framework/` (preparadas para repo externo).
- Legacy pointers: si se mueve un doc, la ruta anterior debe quedar como stub hasta completar migracion de enlaces.

## Naming and Authoring Rules
- Cada archivo debe incluir `Status` y `Last Updated`.
- Un tema, un documento canonico; evitar duplicados.
- Cambios multi-dominio deben referenciar plan activo.
- Para decisiones duraderas de arquitectura, crear/actualizar ADR.

## Non-Disruptive Migration Policy
1. Crear scaffold y hubs primero.
2. Reubicar documentos legacy solo con valor claro y links validados.
3. Cerrar cada lote con plan + handoff + revision de enlaces.

## Publication Readiness Signals
- Seguridad: disclosure policy, threat model y checklist vigentes.
- Gobernanza AI: risk register y gates de eval por release.
- Operacion: runbooks y matriz de configuracion actualizados.
- Arquitectura: C4/specs consistentes con comportamiento real.

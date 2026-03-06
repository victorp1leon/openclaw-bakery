# AI-First Project Development Standard (OpenClaw Bakery)

Status: Draft
Last Updated: 2026-03-03

## Objective
Definir un marco practico para desarrollar y operar OpenClaw Bakery como proyecto AI-first con seguridad primero y evidencia auditable.

## Principles
1. Security-first: ningun cambio AI va a produccion sin controles de seguridad y logging seguro.
2. Spec-first: arquitectura y contratos se actualizan antes de implementar codigo.
3. Eval-first: comportamiento AI se valida con suites reproducibles y gates de release.
4. Traceability: cada decision relevante queda en ADR, specs, planes y handoff.
5. Progressive hardening: se prioriza estructura no disruptiva y mejoras por lotes pequenos.

## Proven Industry Baseline
- NIST AI RMF + GenAI Profile para gobernanza de riesgo AI.
- NIST SSDF para secure software development lifecycle.
- OWASP Top 10 for LLM Applications para amenazas AI especificas.
- C4 + ADR para arquitectura y decisiones.
- Runbook-oriented operations para incidentes y continuidad.

## Required Artifact Domains
1. Product and architecture (`bot-bakery.overview.md`, `c4/`, `adr/`).
2. AI system controls (`ai-system/`).
3. Security policies and threat modeling (`security/`).
4. Operations and reliability (`operations/`).
5. Governance and compliance mapping (`governance/`).
6. Release evidence and readiness (`release/`).

## Publication Readiness Gate (Minimum)
- Vulnerability disclosure policy publicada.
- AI risk register actualizado por release.
- Evals AI con resultado documentado y gate de aprobacion.
- Logging policy y threat model alineados al release.
- Release checklist completado y firmado por owner tecnico.

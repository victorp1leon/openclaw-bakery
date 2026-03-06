# AI-First Documentation Target Structure

Status: In Progress
Last Updated: 2026-03-03

## Target Tree
```text
documentation/
  README.md
  documentation-information-architecture.md

  getting-started/
    README.md
    quickstart.md
    deployment-quickstart.md

  architecture/
    README.md

  ai-system/
    README.md
    prompts/
      README.md
    evals/
      README.md
      offline/README.md
      online/README.md
      red-team/README.md
      release-gates.md
    model-cards/
      README.md
    safety-controls/
      README.md

  security/
    README.md
    threat-model-stride.md
    dev-security-checklist.md
    sensitive-payload-logging-policy.md
    vulnerability-disclosure.md

  operations/
    README.md
    config-matrix.md
    deployment-topology.md
    logging-trace-catalog.md
    runbook-common-failures.md
    sqlite-backup-restore.md
    migrations-versioning.md
    runbooks/README.md
    deployment/README.md
    observability/README.md

  governance/
    README.md
    ai-risk-register.md
    privacy-data-handling.md
    compliance-mappings/
      README.md
      nist-ai-rmf.md
      nist-ssdf.md
      owasp-llm.md

  api/
    README.md
    contracts/README.md
    integration-guides/README.md

  release/
    README.md
    release-process.md
    release-notes/README.md
```

## Why This Structure
- Separa navegacion por audiencia y por tipo de artefacto.
- Permite auditoria de seguridad AI y compliance sin rehacer toda la documentacion.
- Mantiene compatibilidad con la estructura existente (no disruptive-first).

## Migration Strategy
1. Scaffold de nuevas carpetas y READMEs (esta fase).
2. Reubicar contenido legacy solo cuando exista valor claro y links validados.
3. Establecer ownership por dominio y checklist de release documental.

# Gitleaks History Scan Foundation

> **Type:** `Implementation`
> **Status:** `Complete`
> **Created:** `2026-03-13`
> **Last Updated:** `2026-03-13`

## Cross-References
| Documento | Ruta | Uso |
|---|---|---|
| Security scan script | `scripts/security/scan-secrets.js` | Baseline actual de escaneo de secretos en working tree |
| NPM scripts | `package.json` | Punto de entrada para comandos locales |
| Existing CI | `.github/workflows/ci.yml` | Validaciones ya activas |
| Collaboration rules | `AGENTS.md` | Guardrails de aprobacion y flujo |

## Contexto
Se requiere complementar el escaneo actual (working tree) con un escaneo de historial git para detectar posibles filtraciones pasadas de secretos. El objetivo es dejar una vía local reproducible y una validación automática en CI.

## Alcance
### In Scope
- Agregar comando local reproducible para escaneo histórico con gitleaks.
- Agregar workflow dedicado de GitHub Actions para escaneo histórico en PR/push.
- Actualizar documentación mínima para uso del comando.
- Cerrar artefactos de colaboración (plan/index/handoff).

### Out of Scope
- Reescritura de historia git.
- Rotación de secretos (solo diagnóstico por ahora).
- Integración de políticas avanzadas de allowlist/rules de gitleaks.

## Approach
| # | Paso | Estado | Notas |
|---|---|---|---|
| 1 | Crear plan y alcance | Completed | Inicio tras aprobación explícita |
| 2 | Agregar script local (`security:scan:history`) | Completed | Script `scripts/security/scan-history-gitleaks.sh` + entrada npm |
| 3 | Agregar workflow CI (`secret-scan-history`) | Completed | Workflow en `.github/workflows/secret-scan-history.yml` |
| 4 | Actualizar README y validar | Completed | README actualizado + `security:scan` OK + validación de script |
| 5 | Cerrar docs de colaboración | Completed | `_index.md` + session handoff actualizados |

## Decisions & Trade-offs
| Decision | Rationale | Date |
|---|---|---|
| Workflow separado de `ci.yml` | Aísla fallos de secretos de tests/unit y facilita observabilidad | 2026-03-13 |

## Validation
- Checks a ejecutar:
  - `npm run security:scan`
  - `npm run security:scan:history` (si `gitleaks` está disponible localmente)
- Criterio de aceptacion:
  - Comando local reproducible agregado.
  - Workflow CI de history scan agregado.
  - Documentación mínima actualizada.

## Outcome
Se agregó baseline de escaneo histórico de secretos con gitleaks en dos capas: comando local reproducible (`npm run security:scan:history`) y workflow CI dedicado (`Secret Scan (History)`). Validaciones locales ejecutadas: `security:scan` OK, script histórico válido en sintaxis y con fallo esperado por falta de binario `gitleaks` local.

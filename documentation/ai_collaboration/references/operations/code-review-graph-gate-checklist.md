# Code Review Graph Gate Checklist (Operational Template)

Status: Active
Last Updated: 2026-03-24

## Purpose
Checklist reusable para integrar Code Review Graph (CRG) al flujo diario de desarrollo con evidencia minima por etapa, reduciendo review "a ciegas" y regresiones por impacto indirecto.

## Activation Criteria
- Aplicar cuando:
  - el cambio toca `src/runtime/`, `src/tools/`, `src/config/`, `src/skills/` o integraciones en `scripts/`.
  - `CODE_REVIEW_GRAPH_ENABLE=1` y repo objetivo esta en allowlist.
- Se puede omitir cuando:
  - el cambio es solo documental.
  - CRG esta deshabilitado/no disponible (dejar limitacion explicita en cierre).

## Stage Checklist
### Discover
- [ ] Ejecutar `crg build` (o equivalente local del adapter) para baseline.
- [ ] Confirmar `repo_root` efectivo y `trace_ref` inicial.

### Implement
- [ ] Por cada archivo principal modificado, ejecutar `crg impact <archivo> depth 2`.
- [ ] Registrar `impacted_files_count` y archivos adicionales sugeridos por CRG.
- [ ] Ajustar alcance de revision/tests segun radio de impacto.

### Validate / Close
- [ ] Ejecutar `crg context <archivo-critico> line <n>` para contexto de cierre.
- [ ] Registrar en plan/handoff: `trace_ref`, resumen de riesgo y pruebas ejecutadas.
- [ ] Si CRG marca blast radius alto, elevar validacion (smoke/integration adicional).

## Impact Thresholds (Suggested)
- `0-2 impacted files`: riesgo bajo.
  - Unit focalizados + review de dependencias directas.
- `3-5 impacted files`: riesgo medio.
  - Unit focalizados + smoke del dominio afectado.
- `>=6 impacted files`: riesgo alto.
  - Unit + smoke/integration summary y nota explicita de riesgo residual.

## Evidence Snippet (Copy/Paste)
```md
### CRG Evidence
- build: `<trace_ref>`
- impact: `<trace_ref>` | target `<path>` | impacted_files_count `<n>`
- context: `<trace_ref>` | target `<path>:<line>`
- Decision: `<tests/acciones extra aplicadas por impacto>`
```

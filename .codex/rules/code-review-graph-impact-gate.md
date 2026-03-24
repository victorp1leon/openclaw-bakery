# Rule: Code Review Graph Impact Gate (When Enabled)

Status: In Use
Adoption Since: 2026-03-24
Checklist: `documentation/ai_collaboration/references/operations/code-review-graph-gate-checklist.md`

## Policy
- Para cambios elegibles en runtime/tools/integraciones, usar CRG como gate operativo liviano:
  1. `build` baseline al inicio.
  2. `impact` por archivo principal modificado.
  3. `context` de cierre en archivo de mayor riesgo.
- Registrar evidencia minima (`trace_ref`, archivo objetivo, impacto) en cierre de tarea.

## Activation Criteria
- Aplicar cuando:
  - el cambio toca `src/runtime/`, `src/tools/`, `src/config/`, `src/skills/` o scripts de integracion.
  - `CODE_REVIEW_GRAPH_ENABLE=1` y repo objetivo allowlisted.
- Se puede omitir cuando:
  - el cambio es exclusivamente documental.
  - CRG no esta disponible en el entorno (declarar limitacion explicitamente).

## Validation Escalation (Suggested)
- `0-2` archivos impactados: unit focalizados.
- `3-5` archivos impactados: unit + smoke de dominio.
- `>=6` archivos impactados: unit + smoke/integration summary.

## Notes
- Esta regla no reemplaza validaciones obligatorias existentes; las complementa con priorizacion por impacto real.
- Si CRG y evidencia manual discrepan, priorizar seguridad y ampliar validacion.

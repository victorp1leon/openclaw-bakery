# Code Review Graph Integration - Spec

> **Domain:** `platform`
> **Feature Slug:** `code-review-graph-integration`
> **Status:** `In Progress`
> **Created:** `2026-03-24`
> **Last Updated:** `2026-03-24`
> **Legacy Sources:** `N/A`

## Objective
Integrar `code-review-graph` como capacidad externa en OpenClaw Bakery para analisis de impacto y contexto de revision, con controles de seguridad que minimicen exposicion de secretos y acceso a rutas no autorizadas.

## Inputs / Outputs
- Inputs:
  - `operation`: `build_or_update_graph` | `get_impact_radius` | `get_review_context`.
  - `repo_root`: alias logico o ruta canonica permitida por allowlist local.
  - `target_file`: ruta relativa al repo objetivo (requerido para consultas por archivo).
  - `line_number`: entero opcional para consultas de impacto/contexto.
  - `max_depth`: entero opcional para impacto (acotado por limite de seguridad).
  - `include_source`: booleano opcional (default `false`).
  - `timeout_ms`: entero opcional (acotado por limite de runtime).
- Outputs:
  - `status`: `ok` | `error`.
  - `operation`: eco de la operacion solicitada.
  - `summary`: mensaje corto y seguro para operador.
  - `data`: payload sanitizado (sin secretos ni rutas fuera de alcance).
  - `meta`: `trace_ref`, `duration_ms`, `timed_out`, `exit_code`.

## Business Rules
1. La integracion debe ejecutarse bajo feature flag explicito.
2. `repo_root` solo puede resolverse contra allowlist declarada en config.
3. Las rutas de archivo deben permanecer dentro del repo permitido (sin path traversal).
4. `include_source` debe iniciar en `false`; habilitacion explicita solo para uso controlado.
5. Toda salida debe pasar por redaction de patrones sensibles (tokens, keys, secretos).
6. Timeouts y limites de salida deben estar activos para prevenir bloqueo o fuga masiva.
7. Fallos de CLI/adaptador no deben romper el runtime; siempre responder error controlado con `trace_ref`.

## Error Behavior
- Case: `repo_root` fuera de allowlist.
  - Expected behavior: rechazo inmediato con `status=error`, mensaje seguro y `trace_ref`.
- Case: ruta `target_file` invalida o fuera del repo permitido.
  - Expected behavior: rechazo de validacion sin ejecutar comando externo.
- Case: timeout al invocar `code-review-graph`.
  - Expected behavior: retorno controlado con `timed_out=true` y sugerencia de retry seguro.
- Case: salida contiene patron sensible.
  - Expected behavior: redaccion antes de devolver respuesta al usuario.

## Test Cases
1. `build_or_update_graph` exitoso sobre repo permitido retorna `status=ok` y `meta` completo.
2. `repo_root` no permitido retorna `status=error` sin invocacion externa.
3. Payload con intento de traversal (`../`) en `target_file` es bloqueado.
4. Timeout simulado retorna error controlado con `trace_ref`.
5. Redaction elimina secretos simulados del payload de salida.

# Rule: Mandatory Validation by Change Type

## Policy
- Todo cambio debe tener validacion minima proporcional al riesgo antes de cerrar o commitear.

## Minimum Matrix
- Solo docs (`documentation/`, `.codex/`):
  - revisar diff y consistencia de rutas/estado.
- Runtime/config de bajo impacto:
  - ejecutar unit tests focalizados.
- Cambios en ciclo de vida de pedidos (`src/tools/order/`, `src/runtime/` relacionado):
  - unit focalizados + `npm run test:smoke-integration:summary`.
- Cambios live-critical:
  - ejecutar live smoke solo con solicitud explicita del negocio/usuario.

## Reporting
- Siempre documentar:
  - comandos ejecutados
  - resultado pass/fail
  - limitaciones (si no se pudo ejecutar algo)

## Notes
- No declarar "todo ok" sin evidencia de ejecucion.

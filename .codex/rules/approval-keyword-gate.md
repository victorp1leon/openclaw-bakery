# Rule: Approval Keyword Gate

## Policy
- No iniciar implementacion (edicion de codigo/archivos del repo) sin aprobacion explicita del usuario en el mismo hilo, incluyendo la palabra `apruebo`.
- No crear commits ni ejecutar flujo de commit sin instruccion explicita del usuario en el mismo hilo, incluyendo la palabra `apruebo`.

## Allowed Without `apruebo`
- Investigacion, lectura de codigo/docs, diagnostico y propuesta de plan.
- Validaciones no destructivas solicitadas por el usuario.

## Verification
- Antes de editar archivos o commitear, confirmar que el mensaje del usuario contiene `apruebo`.
- Si no existe esa aprobacion, responder con estado y pedir confirmacion explicita con `apruebo`.

## Notes
- Ejemplos validos: `dale, apruebo`, `continua, apruebo`, `haz commit, apruebo`.

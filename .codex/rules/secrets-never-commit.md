# Rule: Secrets Never Commit

## Policy
- Nunca incluir secretos en commits:
  - `.env`
  - API tokens/keys
  - credenciales embebidas en codigo o docs

## Required Checks
- Revisar staging:
  - `git status --short`
  - `git diff --cached --name-only`
- Ejecutar escaneo:
  - `npm run security:scan`

## Applies To
- Commits manuales y asistidos.
- Cambios en `scripts/`, `src/config/`, `documentation/`, `.codex/`.

## Exception Handling
- No hay excepciones para commitear secretos reales.
- Para ejemplos, usar placeholders (`<TOKEN>`, `<ID>`, `<SECRET>`).

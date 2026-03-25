# Rule: Security Scan Test Fixture Guard

## Objective
Evitar falsos positivos recurrentes en `npm run security:scan` causados por fixtures de tests, sin debilitar el control de secretos.

## Policy
- En tests, evitar literales largos (`>=12`) en asignaciones con llaves sensibles como:
  - `token`, `secret`, `apiKey`, `password`
- Para datos de prueba, preferir placeholders cortos y neutros (ej. `tok-test`, `mask-key`).
- Si el objetivo del test es verificar redaccion de campos sensibles, validar la salida redaccionada (`REDACTED`) sin usar valores con apariencia de secreto real.

## Required Practices
- Antes de commit, ejecutar:
  - `npm run security:scan`
- Si aparece hallazgo en tests por fixture no real:
  1. Primero ajustar fixture a placeholder seguro/corto.
  2. Usar `security-scan: ignore` solo como ultimo recurso y solo en linea justificada.

## Applies To
- `src/**/*.test.ts`
- `scripts/**/*.test.ts`
- Smokes y fixtures de validacion en `scripts/smoke/*`.

## Non-Goals
- No reduce ni desactiva el scanner.
- No permite commitear secretos reales.

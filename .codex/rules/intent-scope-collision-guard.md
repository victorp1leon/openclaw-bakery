# Rule: Intent Scope Collision Guard

## Policy
- Cuando dos intents comparten el mismo dominio semantico (ej. `agenda`) pero difieren por alcance (`day|week|month|year`), el routing debe definir precedencia explicita y exclusiones duras.
- Ninguna rama de aclaracion (`*_NeedsScope`) puede secuestrar otra rama de mayor alcance si ya hay pista de scope presente (ej. `semana`, `semanal`).
- Todo cambio de deteccion por alcance debe incluir prueba de regresion para el par en conflicto.

## When This Rule Applies
- Cambios en deteccion de intents con ambito temporal (`dia/semana/mes/anio`) en `src/runtime/conversationProcessor.ts`.
- Cambios de prompts de aclaracion (`*_query`) que puedan redirigir al intent equivocado.
- Cambios en routing read-only (`src/skills/readOnlyIntentRouter.ts`) para intents hermanos por alcance.

## Mandatory Validation
1. Ejecutar pruebas focalizadas de runtime:
   - `npm test -- --run src/runtime/conversationProcessor.test.ts`
2. Si cambió routing read-only, ejecutar:
   - `npm test -- --run src/skills/readOnlyIntentRouter.test.ts`
3. Validar cobertura intent-skill:
   - `npm run check:intent-skills`
4. Incluir al menos estos casos de no-interferencia (o equivalentes):
   - frase diaria -> `schedule.day_view`
   - frase semanal -> `schedule.week_view`
   - frase semanal sin scope explicito -> pregunta `schedule_week_query` (no `schedule_day_query`)

## Checklist
1. Identificar familia de intents por alcance (ej. `schedule.day_view` vs `schedule.week_view`).
2. Declarar precedencia (quien gana en ambiguedad) y exclusion explicita del vecino.
3. Alinear detectores de happy path y detectores de missing scope con la misma exclusion.
4. Verificar que el fallback deterministico y el routing OpenClaw no diverjan en alcance.
5. Reflejar el comportamiento en tests de runtime/router antes de cerrar.

## Reporting
- En cierre de tarea/commit, declarar:
  - familia de intents evaluada
  - exclusion aplicada
  - tests de no-interferencia ejecutados.

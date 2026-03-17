# Rule: Intent Disambiguation Guard

## Policy
- Todo cambio en deteccion/routing de intents debe demostrar que no secuestra intents vecinos por superposicion semantica.
- Si un intent necesita heuristicas amplias (ej. palabras clave genericas), deben incluir una condicion de exclusion para intents cercanos.
- No cerrar implementaciones ni commits de cambios de routing sin pruebas negativas de no-interferencia.

## When This Rule Applies
- Cambios en `src/runtime/conversationProcessor.ts` sobre deteccion, parseo o pending flows de intents.
- Cambios en herramientas read-only/mutables cuyo wording modifique como el runtime decide intent.
- Cambios en specs/skills que alteren frases gatillo o vocabulario operativo.

## Mandatory Validation
1. Ejecutar pruebas focalizadas de runtime:
   - `npm test -- src/runtime/conversationProcessor.test.ts`
2. Si se tocó `src/tools/**` o hubo cambios de intents, ejecutar cobertura intent-skill:
   - `npm run check:intent-skills`
3. Agregar/ajustar test(s) de no-interferencia para el caso ambiguo principal.

## Checklist
1. Definir el par de intents en conflicto (ej. `reporte` vs `order.lookup`).
2. Implementar guard explicito en deteccion (inclusion + exclusion).
3. Validar flujo feliz del intent objetivo.
4. Validar que el intent vecino mantiene su routing esperado.
5. Reflejar la decision en spec/skill si cambia el contrato conversacional.

## Reporting
- En cierre de tarea/commit, declarar:
  - conflictos evaluados
  - guard aplicado
  - tests de no-interferencia ejecutados.

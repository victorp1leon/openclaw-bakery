# Rule: Read-Only Partial Intervention Standard

## Policy
- Todo intent read-only que excluya datos por calidad insuficiente debe comunicarlo explicitamente al usuario en un bloque visible de `Intervencion manual requerida`.
- No se permite degradacion silenciosa en calculos operativos cuando falten datos criticos (por ejemplo, cantidad invalida o receta faltante).
- Cuando exista fallback de continuidad (ej. fuente secundaria), la respuesta debe declarar el supuesto en `Supuestos`.

## Scope
- Aplica a intents read-only con agregacion/calculo operativo (por ejemplo: `shopping.list.generate`, `schedule.day_view` y similares).
- Aplica en:
  - `src/tools/**` (resultado estructurado con incidencias/intervenciones)
  - `src/runtime/conversationProcessor.ts` (formato de respuesta visible)
  - specs/skills relacionadas

## Implementation Checklist
1. El tool debe clasificar y exponer incidencias de datos excluidos en una estructura dedicada (ej. `manualIntervention[]`).
2. Runtime debe renderizar un bloque explicito de intervención manual cuando existan incidencias.
3. Si no quedan filas validas tras exclusiones, responder con mensaje controlado que lo explique (sin ambiguedad).
4. Si se usa fallback operativo, agregar supuesto explicito en salida de usuario.
5. Agregar test de caso parcial (resultado util + intervención manual) y caso de exclusión por dato crítico.

## Mandatory Validation
1. Ejecutar tests focalizados del tool y runtime afectados.
2. Si se tocó `src/runtime/conversationProcessor.ts` o `src/tools/**`, ejecutar:
   - `npm run check:intent-skills`
3. Verificar que no se oculten errores crudos/proveedor en mensajes al usuario.

## Guardrails
- No usar "defaults inventados" para campos críticos de cálculo sin notificar al usuario.
- No reemplazar intervención manual con un único mensaje genérico de error total si existe resultado parcial útil.
- Mantener mensajes accionables y cortos para operación diaria.

## Reporting
- En cierre de tarea/commit, declarar:
  - qué datos se excluyeron y por qué
  - qué fallbacks se aplicaron
  - qué bloque de intervención manual se muestra

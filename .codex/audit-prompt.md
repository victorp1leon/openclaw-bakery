Audita y limpia con cuidado el sistema OpenClaw Bakery en `/home/victor/openclaw-bakery`.

Opera en modo safety-first y evidence-first. Tu meta es mejorar correctitud, claridad y mantenibilidad sin cambiar comportamiento esperado ni romper flujos live.

## Contexto Canonico (no usar placeholders)
- Repositorio canonico: `/home/victor/openclaw-bakery`
- Artefactos de colaboracion:
  - `documentation/ai_collaboration/plans/_index.md`
  - `documentation/ai_collaboration/system-map.md`
  - `documentation/ai_implementation/implementation-instructions.md`
- Guardrails operativos:
  - `AGENTS.md`
  - `.codex/rules/README.md`
  - `.codex/rules/*`
- Mapa principal de codigo:
  - `src/runtime/`, `src/guards/`, `src/skills/`, `src/openclaw/`, `src/state/`, `src/tools/`, `src/channel/`

## Flujo Obligatorio
1. Research no mutante:
   - inspecciona codigo, docs, planes y handoff relacionado antes de proponer cambios.
2. Reporte de hallazgos:
   - lista hallazgos por severidad con evidencia concreta (archivo + razon + riesgo).
3. Gate de remediacion:
   - no iniciar implementacion (edicion de archivos) sin aprobacion explicita del usuario con la palabra `apruebo`.
4. Validacion proporcional:
   - ejecuta validaciones no destructivas y reporta comandos/resultados/limitaciones.
5. Cierre:
   - resume que se cambio, que no se cambio por seguridad y que queda pendiente.

## Prioridad
1. Corregir breakages operativos concretos.
2. Reparar config invalida cargada por maquina.
3. Corregir paths rotos y referencias stale (jobs/scripts/docs).
4. Endurecer validacion/health checks e higiene del repo.
5. Reducir duplicacion solo cuando sea low-risk y bien acotado.
6. Alinear documentacion con comportamiento real.

## Safety Rules
- Preservar comportamiento salvo correccion requerida por seguridad/correctitud.
- No borrar archivos, retirar subsistemas, rotar secretos o desactivar workflows sin aprobacion explicita.
- No simplificar arquitectura agresivamente por defecto.
- No usar comandos destructivos de git.
- No revertir cambios no relacionados.
- Si un cambio tiene consecuencias no obvias (operativas, de datos o live), detener y pedir confirmacion.
- Preferir cambios pequenos y reversibles.
- No ejecutar operaciones live sin flags explicitos y confirmacion del negocio/usuario.
- No crear commits sin instruccion explicita del usuario que incluya `apruebo`.

## Entregable Esperado
- Hallazgos priorizados con evidencia.
- Plan de remediacion de bajo riesgo.
- Si hubo aprobacion (`apruebo`), cambios aplicados y validados.
- Resumen final con:
  1. que cambiaste
  2. que no cambiaste por seguridad
  3. que validaste
  4. que requiere aprobacion explicita para continuar

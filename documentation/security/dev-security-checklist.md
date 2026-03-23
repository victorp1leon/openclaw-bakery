# Dev Security Checklist (Local + PR)

Status: MVP  
Last Updated: 2026-03-03

Objetivo: tener un checklist corto y verificable para evitar regresiones de seguridad durante desarrollo diario.

## 1) Antes de abrir PR
- [ ] Ejecutar `npm run security:scan` (deteccion de secretos hardcodeados).
- [ ] Ejecutar `npm test`.
- [ ] Confirmar que no se agregaron logs con payloads completos o datos sensibles.
- [ ] Confirmar que cambios en integraciones externas mantienen gate de confirmacion (`confirmar/cancelar`).
- [ ] Confirmar que no se removio ni debilito `allowlist`/idempotencia.

## 2) Checks de logging seguro
- [ ] Mantener redaction keys requeridas: `*.token`, `*.secret`, `*.botToken`, `*.apiKey`, `headers.authorization`.
- [ ] Loggear `text_preview` (no payload completo).
- [ ] No loggear `.env`, headers auth, ni cuerpos completos de requests/responses de conectores.

## 3) Checks de configuracion y secretos
- [ ] No commitear valores reales en `.env`.
- [ ] Preferir variables de entorno en runtime para tokens/API keys.
- [ ] Si hubo fuga accidental, rotar credenciales y registrar incidente.

## 4) Checks de cambios de arquitectura/comportamiento
- [ ] Si cambia un contrato/flujo critico, actualizar spec(s) en `documentation/specs/contracts/components/`.
- [ ] Si cambia riesgo o superficie de ataque, actualizar `documentation/security/threat-model-stride.md`.
- [ ] Si cambia politica de logs, actualizar `documentation/security/sensitive-payload-logging-policy.md`.

## 5) Comando recomendado de validacion rapida
```bash
npm run verify:security
```


# Admin Allowlist - Clarifications

> **Domain:** `runtime`
> **Feature Slug:** `admin-allowlist`
> **Status:** `Complete`
> **Created:** `2026-03-25`
> **Last Updated:** `2026-03-25`
> **Legacy Sources:** `N/A`

## Open Questions
1. ¿La persistencia de allowlist debe actualizar automaticamente `.env`/secrets manager en `v1.1`?
2. ¿Conviene separar roles (`viewer` vs `manager`) para operaciones admin en una siguiente iteracion?

## Decisions
| Decision | Rationale | Date |
|---|---|---|
| `view` sin confirm flow; `add/remove` con confirm flow | Minimiza friccion de consulta y protege mutaciones | 2026-03-25 |
| Bloquear `self-remove` y violacion de minimo | Evita lockout accidental y reduce riesgo operativo | 2026-03-25 |
| Persistencia temporal en memoria runtime (`persistent=false`) | Entrega segura en `v1` sin mutar configuracion externa automaticamente | 2026-03-25 |

## Deferred Items
- Persistencia durable de allowlist con runbook de rollback (`v1.1`).
- Modelo de permisos admin por rol (`v1.1`).

# SQLite Backup and Restore Notes

Status: MVP
Last Updated: 2026-02-26

Operational notes for `bot.db` (or custom `BOT_DB_PATH`).

## Database location
- Runtime DB path is `BOT_DB_PATH`, default `bot.db`.

## Backup strategy
- Keep timestamped backups.
- Encrypt backups before cloud/off-machine storage.
- Test restore periodically.

## Online backup (preferred with sqlite3 CLI)

```bash
mkdir -p backups
sqlite3 "${BOT_DB_PATH:-bot.db}" ".backup 'backups/bot-$(date +%F-%H%M%S).db'"
```

## Offline backup (runtime stopped)

```bash
mkdir -p backups
cp "${BOT_DB_PATH:-bot.db}" "backups/bot-$(date +%F-%H%M%S).db"
```

## Restore procedure

1. Stop the bot runtime.
2. Keep current DB as safety copy.
3. Restore selected backup.
4. Run healthcheck and a smoke test.

Example:

```bash
cp "${BOT_DB_PATH:-bot.db}" "${BOT_DB_PATH:-bot.db}.pre-restore.$(date +%F-%H%M%S)"
cp "backups/<chosen-backup>.db" "${BOT_DB_PATH:-bot.db}"
npm run healthcheck
```

## Post-restore checks
- Healthcheck `sqlite` status is `ok`.
- Basic query counts are non-zero as expected:

```bash
sqlite3 "${BOT_DB_PATH:-bot.db}" "SELECT COUNT(*) FROM convo_state;"
sqlite3 "${BOT_DB_PATH:-bot.db}" "SELECT COUNT(*) FROM operations;"
```

## Data sensitivity
- DB may contain chat/business data and operation traces.
- Do not commit DB files to git.
- Treat DB files and snapshots as sensitive artifacts.


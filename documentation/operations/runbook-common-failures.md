# Bot Bakery Runbook - Common Failures

Status: MVP
Last Updated: 2026-02-26

Operational runbook for local/dev runtime incidents.

## Quick diagnostics

```bash
npm run healthcheck
npm run dev
```

If needed:

```bash
ss -tulpn | grep -E 'LISTEN|node|openclaw'
```

## 1) Telegram channel does not start

### Symptoms
- Startup fails with channel error.
- Log contains `telegram_bot_token_missing` or `No se pudo iniciar el canal`.

### Checks
- `CHANNEL_MODE=telegram`
- `TELEGRAM_BOT_TOKEN` is set
- `TELEGRAM_API_BASE_URL` is correct

### Actions
1. Set/fix token in environment.
2. Re-run `npm run healthcheck`.
3. Restart runtime (`npm run dev`).

## 2) Unauthorized replies for valid user

### Symptoms
- User receives `No autorizado para usar este bot.`
- `conversation_trace` event `allowlist_reject`.

### Checks
- `ALLOWLIST_CHAT_IDS` includes exact chat ID as string.
- Telegram `chat.id` is being stringified as expected.

### Actions
1. Add missing `chat_id` to `ALLOWLIST_CHAT_IDS`.
2. Restart runtime if config source requires reload.
3. Re-test with one message.

## 3) Repeated `parse_failed` traces / model output issues

### Symptoms
- User receives parse error/reformulation message.
- `conversation_trace` includes `parse_failed`.

### Checks
- `OPENCLAW_ENABLE=1` (if expected).
- `OPENCLAW_TIMEOUT_SECONDS` is reasonable.
- OpenClaw profile/agent configuration is valid.

### Actions
1. Verify OpenClaw runtime config via `runtime_config` log.
2. Increase timeout if model is consistently timing out.
3. If strict softfail is intended, enable `OPENCLAW_STRICT_SOFTFAIL=1`.
4. Re-test with a simpler command payload.

## 4) Telegram polling errors

### Symptoms
- `Telegram polling error` warnings.

### Checks
- internet/network availability
- Telegram API base URL
- temporary API response errors

### Actions
1. Confirm outbound connectivity.
2. Validate token still active.
3. Keep runtime running: polling loop already retries with backoff interval.

## 5) SQLite open/lock issues

### Symptoms
- Healthcheck `sqlite` status `fail`.
- Runtime errors involving DB access/locking.

### Checks
- `BOT_DB_PATH` path exists and is writable.
- Another process is not holding conflicting lock.

### Actions
1. Stop duplicate runtime processes.
2. Verify file permissions and disk space.
3. Restore from latest backup if DB corruption is suspected.

## 6) Duplicate operation detected unexpectedly

### Symptoms
- User receives duplicate operation response.
- Operation resolves to existing `operation_id`/status.

### Checks
- repeated identical payload in short dedupe window
- re-sent confirmation/request messages by user/channel

### Actions
1. Confirm whether duplicate is expected protection behavior.
2. If not expected, inspect idempotency key inputs and timestamps.
3. Use operation trace/history before replaying manually.


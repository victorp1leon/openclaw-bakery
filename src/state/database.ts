import Database from "better-sqlite3";

const dbPath = process.env.BOT_DB_PATH ?? "bot.db";

export const db = new Database(dbPath);

function hasColumn(table: string, column: string): boolean {
  const rows = db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
  return rows.some((row) => row.name === column);
}

function runMigrations() {
  db.exec(`
CREATE TABLE IF NOT EXISTS convo_state (
  chat_id TEXT PRIMARY KEY,
  state_json TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS operations (
  operation_id TEXT PRIMARY KEY,
  chat_id TEXT NOT NULL,
  intent TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  status TEXT NOT NULL,
  idempotency_key TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT
);
`);

  if (!hasColumn("operations", "idempotency_key")) {
    db.exec("ALTER TABLE operations ADD COLUMN idempotency_key TEXT");
  }

  if (!hasColumn("operations", "updated_at")) {
    db.exec("ALTER TABLE operations ADD COLUMN updated_at TEXT");
  }

  db.exec(`
    UPDATE operations
    SET idempotency_key = operation_id
    WHERE idempotency_key IS NULL OR TRIM(idempotency_key) = ''
  `);

  db.exec(`
    UPDATE operations
    SET updated_at = COALESCE(updated_at, created_at)
    WHERE updated_at IS NULL OR TRIM(updated_at) = ''
  `);

  db.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_operations_idempotency ON operations(idempotency_key)");
}

runMigrations();

export function closeDatabase() {
  if (db.open) db.close();
}

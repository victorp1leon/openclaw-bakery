import dotenv from "dotenv";

import { loadAppConfig } from "./config/appConfig";
import { parseAllowedChatIds } from "./guards/allowlistGuard";
import { runHealthcheck } from "./health/healthcheck";
import { db } from "./state/database";

dotenv.config();

const config = loadAppConfig();
const allowlist = parseAllowedChatIds(config.allowedChatIdsRaw);
const dbPath = process.env.BOT_DB_PATH ?? "bot.db";

const report = runHealthcheck({
  config,
  dbOpen: db.open,
  dbPath,
  allowlistSize: allowlist.size
});

console.log(JSON.stringify(report, null, 2));
process.exitCode = report.status === "fail" ? 1 : 0;


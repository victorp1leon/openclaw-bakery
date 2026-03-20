import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

type Status = "PASS" | "FAILED" | "PENDING" | "TODO" | "SKIPPED" | "UNKNOWN";

type SummaryRow = {
  tipo: "smoke" | "integration";
  escenario: string;
  caso: string;
  test: string;
  estado: Status;
  detail?: string;
};

type SmokeCommand = {
  scenario: string;
  npmScript: string;
  env?: Record<string, string>;
};

type CommandResult = {
  status: number | null;
  signal: NodeJS.Signals | null;
  output: string;
  durationMs: number;
};

type VitestAssertionResult = {
  ancestorTitles?: string[];
  fullName?: string;
  status?: string;
  title?: string;
  failureMessages?: string[];
};

type VitestSuiteResult = {
  name?: string;
  assertionResults?: VitestAssertionResult[];
};

type VitestJsonReport = {
  numTotalTests?: number;
  numPassedTests?: number;
  numFailedTests?: number;
  testResults?: VitestSuiteResult[];
};

function formatTimestamp(date: Date): string {
  const year = String(date.getUTCFullYear());
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  const hour = String(date.getUTCHours()).padStart(2, "0");
  const minute = String(date.getUTCMinutes()).padStart(2, "0");
  const second = String(date.getUTCSeconds()).padStart(2, "0");
  return `${year}${month}${day}-${hour}${minute}${second}`;
}

function sanitizeForFileName(value: string): string {
  return value.replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "").toLowerCase() || "output";
}

function truncate(value: string | undefined, max = 160): string {
  const text = (value ?? "").replace(/\s+/g, " ").trim();
  if (text.length <= max) return text;
  return `${text.slice(0, max - 3)}...`;
}

function firstFailureLine(failureMessages: string[] | undefined): string | undefined {
  if (!failureMessages || failureMessages.length === 0) return undefined;
  const first = failureMessages[0] ?? "";
  const line = first.split("\n")[0]?.trim();
  return line && line.length > 0 ? line : undefined;
}

function toRelativePath(value: string): string {
  const relative = path.relative(process.cwd(), value);
  return relative.length > 0 && !relative.startsWith("..") ? relative : value;
}

function mapVitestStatus(raw: string | undefined): Status {
  const value = (raw ?? "").trim().toLowerCase();
  if (value === "passed") return "PASS";
  if (value === "failed") return "FAILED";
  if (value === "pending") return "PENDING";
  if (value === "todo") return "TODO";
  if (value === "skipped") return "SKIPPED";
  return "UNKNOWN";
}

function mapBooleanToStatus(value: boolean): Status {
  return value ? "PASS" : "FAILED";
}

function extractJsonObjects(text: string): Record<string, unknown>[] {
  const out: Record<string, unknown>[] = [];

  let depth = 0;
  let start = -1;
  let inString = false;
  let escaped = false;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];

    if (depth === 0) {
      if (ch === "{") {
        depth = 1;
        start = i;
        inString = false;
        escaped = false;
      }
      continue;
    }

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (ch === "\\") {
        escaped = true;
      } else if (ch === "\"") {
        inString = false;
      }
      continue;
    }

    if (ch === "\"") {
      inString = true;
      continue;
    }

    if (ch === "{") {
      depth += 1;
      continue;
    }

    if (ch === "}") {
      depth -= 1;
      if (depth === 0 && start >= 0) {
        const candidate = text.slice(start, i + 1);
        try {
          const parsed = JSON.parse(candidate);
          if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
            out.push(parsed as Record<string, unknown>);
          }
        } catch {
          // ignore non-JSON object-like snippets
        }
        start = -1;
      }
    }
  }

  return out;
}

function runNpmScript(args: {
  script: string;
  logPath: string;
  env?: Record<string, string>;
}): CommandResult {
  const started = Date.now();
  const env = {
    ...process.env,
    ...(args.env ?? {})
  };

  if (process.platform === "win32") {
    const result = spawnSync("npm.cmd", ["run", args.script], {
      encoding: "utf8",
      env
    });
    const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`.trim();
    fs.writeFileSync(args.logPath, output, "utf8");
    return {
      status: result.status,
      signal: result.signal,
      output,
      durationMs: Date.now() - started
    };
  }

  const command = `npm run ${args.script} > ${shellQuote(args.logPath)} 2>&1`;
  const result = spawnSync("bash", ["-lc", command], {
    encoding: "utf8",
    env
  });
  const output = fs.existsSync(args.logPath) ? fs.readFileSync(args.logPath, "utf8") : "";

  return {
    status: result.status,
    signal: result.signal,
    output,
    durationMs: Date.now() - started
  };
}

function runVitestIntegration(args: {
  outputFile: string;
  logPath: string;
}): CommandResult {
  const started = Date.now();

  if (process.platform === "win32") {
    const result = spawnSync(
      "npx.cmd",
      [
        "vitest",
        "run",
        "src/**/*.integration.test.ts",
        "--reporter=json",
        `--outputFile=${args.outputFile}`
      ],
      {
        encoding: "utf8",
        env: process.env
      }
    );
    const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`.trim();
    fs.writeFileSync(args.logPath, output, "utf8");
    return {
      status: result.status,
      signal: result.signal,
      output,
      durationMs: Date.now() - started
    };
  }

  const command = [
    "npx vitest run src/**/*.integration.test.ts",
    "--reporter=json",
    `--outputFile=${shellQuote(args.outputFile)}`,
    `> ${shellQuote(args.logPath)} 2>&1`
  ].join(" ");

  const result = spawnSync("bash", ["-lc", command], {
    encoding: "utf8",
    env: process.env
  });
  const output = fs.existsSync(args.logPath) ? fs.readFileSync(args.logPath, "utf8") : "";

  return {
    status: result.status,
    signal: result.signal,
    output,
    durationMs: Date.now() - started
  };
}

function shellQuote(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

function buildIsolatedSmokeChatId(args: { runId: string; scenario: string; index: number }): string {
  const scenarioTag = sanitizeForFileName(args.scenario).slice(0, 20) || "scenario";
  return `smoke-${args.runId}-${String(args.index + 1).padStart(2, "0")}-${scenarioTag}`;
}

function inferSmokeTestLabel(payload: Record<string, unknown>): string {
  const input = payload.input;
  if (typeof input === "string" && input.trim().length > 0) return truncate(input.trim());

  const detail = payload.detail;
  if (typeof detail === "string" && detail.trim().length > 0) return truncate(detail.trim());

  const reply = payload.reply;
  if (typeof reply === "string" && reply.trim().length > 0) return truncate(reply.trim());

  const operationId = payload.operationId;
  if (typeof operationId === "string" && operationId.trim().length > 0) return `operationId=${operationId.trim()}`;

  const operation_id = payload.operation_id;
  if (typeof operation_id === "string" && operation_id.trim().length > 0) return `operation_id=${operation_id.trim()}`;

  return "-";
}

function pushSmokeEventRows(args: {
  scenario: string;
  payload: Record<string, unknown>;
  rows: SummaryRow[];
}): void {
  const event = typeof args.payload.event === "string" ? args.payload.event : undefined;
  if (!event) return;

  if (event.endsWith("_start") || event.endsWith("_attempt")) return;

  if (event === "order_smoke_result") {
    const createCard = args.payload.createCard as Record<string, unknown> | undefined;
    if (createCard && typeof createCard.ok === "boolean") {
      args.rows.push({
        tipo: "smoke",
        escenario: args.scenario,
        caso: "order_smoke_result.createCard",
        test: inferSmokeTestLabel(createCard),
        estado: mapBooleanToStatus(createCard.ok)
      });
    }

    const appendOrder = args.payload.appendOrder as Record<string, unknown> | undefined;
    if (appendOrder && typeof appendOrder.ok === "boolean") {
      args.rows.push({
        tipo: "smoke",
        escenario: args.scenario,
        caso: "order_smoke_result.appendOrder",
        test: inferSmokeTestLabel(appendOrder),
        estado: mapBooleanToStatus(appendOrder.ok)
      });
    }
    return;
  }

  if (event.endsWith("_failed")) {
    args.rows.push({
      tipo: "smoke",
      escenario: args.scenario,
      caso: event,
      test: inferSmokeTestLabel(args.payload),
      estado: "FAILED",
      detail: typeof args.payload.detail === "string" ? truncate(args.payload.detail, 300) : undefined
    });
    return;
  }

  if (typeof args.payload.ok === "boolean") {
    args.rows.push({
      tipo: "smoke",
      escenario: args.scenario,
      caso: event,
      test: inferSmokeTestLabel(args.payload),
      estado: mapBooleanToStatus(args.payload.ok)
    });
  }
}

function collectSmokeRows(args: {
  scenario: string;
  commandResult: CommandResult;
}): SummaryRow[] {
  const rows: SummaryRow[] = [];
  const payloads = extractJsonObjects(args.commandResult.output);

  for (const payload of payloads) {
    pushSmokeEventRows({ scenario: args.scenario, payload, rows });
  }

  const hasFailure = rows.some((row) => row.estado === "FAILED");
  if ((args.commandResult.status ?? 1) !== 0 && !hasFailure) {
    rows.push({
      tipo: "smoke",
      escenario: args.scenario,
      caso: "command_exit",
      test: `exit=${args.commandResult.status ?? "signal"} signal=${args.commandResult.signal ?? "-"}`,
      estado: "FAILED",
      detail: truncate(args.commandResult.output, 300)
    });
  }

  if (rows.length === 0) {
    rows.push({
      tipo: "smoke",
      escenario: args.scenario,
      caso: "command_exit",
      test: `exit=${args.commandResult.status ?? "signal"} signal=${args.commandResult.signal ?? "-"}`,
      estado: (args.commandResult.status ?? 1) === 0 ? "PASS" : "FAILED",
      detail: truncate(args.commandResult.output, 300)
    });
  }

  return rows;
}

function collectIntegrationRows(args: {
  jsonReportPath: string;
  commandResult: CommandResult;
}): SummaryRow[] {
  const rows: SummaryRow[] = [];

  if (!fs.existsSync(args.jsonReportPath)) {
    rows.push({
      tipo: "integration",
      escenario: "integration.vitest",
      caso: "report_generation",
      test: "vitest json report",
      estado: "FAILED",
      detail: `missing_report:${toRelativePath(args.jsonReportPath)}`
    });
    return rows;
  }

  const raw = fs.readFileSync(args.jsonReportPath, "utf8");
  const report = JSON.parse(raw) as VitestJsonReport;

  for (const suite of report.testResults ?? []) {
    const scenario = toRelativePath(suite.name ?? "(suite-sin-nombre)");
    for (const assertion of suite.assertionResults ?? []) {
      const caseName = (assertion.ancestorTitles ?? []).join(" > ") || "(sin describe)";
      const testName = assertion.title?.trim() || assertion.fullName?.trim() || "(test-sin-nombre)";
      const status = mapVitestStatus(assertion.status);
      rows.push({
        tipo: "integration",
        escenario: scenario,
        caso: caseName,
        test: testName,
        estado: status,
        detail: status === "FAILED" ? firstFailureLine(assertion.failureMessages) : undefined
      });
    }
  }

  if (rows.length === 0) {
    rows.push({
      tipo: "integration",
      escenario: "integration.vitest",
      caso: "execution",
      test: "src/**/*.integration.test.ts",
      estado: (args.commandResult.status ?? 1) === 0 ? "PASS" : "FAILED",
      detail: truncate(args.commandResult.output, 300)
    });
  }

  return rows;
}

function escapeCell(value: string): string {
  return value.replace(/\|/g, "\\|").replace(/\r?\n/g, "<br/>");
}

function summarize(rows: SummaryRow[]): { total: number; passed: number; failed: number } {
  return {
    total: rows.length,
    passed: rows.filter((row) => row.estado === "PASS").length,
    failed: rows.filter((row) => row.estado === "FAILED").length
  };
}

function buildMarkdown(args: {
  generatedAt: Date;
  smokeMode: "mock" | "live";
  smokeRows: SummaryRow[];
  integrationRows: SummaryRow[];
}): string {
  const allRows = [...args.smokeRows, ...args.integrationRows];
  const overall = summarize(allRows);
  const smoke = summarize(args.smokeRows);
  const integration = summarize(args.integrationRows);

  const lines: string[] = [];
  lines.push("# Smoke + Integration Test Summary");
  lines.push("");
  lines.push(`Generated at: ${args.generatedAt.toISOString()}`);
  lines.push(`Smoke mode: ${args.smokeMode}`);
  lines.push("");
  lines.push("## Summary");
  lines.push(`Total tests: ${overall.total}`);
  lines.push(`Passed: ${overall.passed}`);
  lines.push(`Failed: ${overall.failed}`);
  lines.push("");
  lines.push(`Smoke tests -> Total: ${smoke.total}, Passed: ${smoke.passed}, Failed: ${smoke.failed}`);
  lines.push(`Integration tests -> Total: ${integration.total}, Passed: ${integration.passed}, Failed: ${integration.failed}`);
  lines.push("");
  lines.push("## Results");
  lines.push("");
  lines.push("| Tipo | Escenario | Caso | Test | Estado |");
  lines.push("|---|---|---|---|---|");

  for (const row of allRows) {
    lines.push(
      `| ${row.tipo} | ${escapeCell(row.escenario)} | ${escapeCell(row.caso)} | ${escapeCell(row.test)} | ${row.estado} |`
    );
  }

  const failedRows = allRows.filter((row) => row.estado === "FAILED");
  if (failedRows.length > 0) {
    lines.push("");
    lines.push("## Failed Details");
    lines.push("");
    for (const row of failedRows) {
      lines.push(`- [${row.tipo}] ${row.escenario} :: ${row.caso} :: ${row.test}`);
      lines.push(`  - ${row.detail ?? "(no detail)"} `);
    }
  }

  return `${lines.join("\n")}\n`;
}

function main(): void {
  const generatedAt = new Date();
  const timestamp = formatTimestamp(generatedAt);
  const smokeLive = process.env.SMOKE_SUMMARY_LIVE === "1";
  const smokeMode: "mock" | "live" = smokeLive ? "live" : "mock";

  const reportsDir = path.join(process.cwd(), "reports", "smoke-integration");
  const historyDir = path.join(reportsDir, "history");
  fs.mkdirSync(historyDir, { recursive: true });

  const smokeCommands: SmokeCommand[] = [
    {
      scenario: "smoke:expense",
      npmScript: "smoke:expense",
      env: smokeLive ? undefined : { EXPENSE_TOOL_DRY_RUN: "1" }
    },
    {
      scenario: "smoke:order",
      npmScript: "smoke:order",
      env: smokeLive ? undefined : { ORDER_TRELLO_DRY_RUN: "1", ORDER_SHEETS_DRY_RUN: "1" }
    },
    {
      scenario: "smoke:report",
      npmScript: "smoke:report",
      env: smokeLive ? undefined : { SMOKE_REPORT_LIVE: "0" }
    },
    {
      scenario: "smoke:lookup",
      npmScript: "smoke:lookup",
      env: smokeLive ? undefined : { SMOKE_LOOKUP_LIVE: "0" }
    },
    {
      scenario: "smoke:status",
      npmScript: "smoke:status",
      env: smokeLive ? undefined : { SMOKE_STATUS_LIVE: "0" }
    },
    {
      scenario: "smoke:readonly-routing-trace",
      npmScript: "smoke:readonly-routing-trace",
      env: {
        OPENCLAW_READONLY_ROUTING_ENABLE: "1",
        OPENCLAW_READONLY_QUOTE_ENABLE: "1",
        OPENCLAW_STRICT: "0"
      }
    },
    {
      scenario: "smoke:schedule",
      npmScript: "smoke:schedule",
      env: smokeLive ? undefined : { SMOKE_SCHEDULE_LIVE: "0" }
    },
    {
      scenario: "smoke:quote",
      npmScript: "smoke:quote",
      env: smokeLive ? undefined : { SMOKE_QUOTE_LIVE: "0" }
    },
    {
      scenario: "smoke:update",
      npmScript: "smoke:update",
      env: smokeLive ? undefined : { SMOKE_UPDATE_LIVE: "0", SMOKE_UPDATE_DRY_RUN: "1" }
    },
    {
      scenario: "smoke:cancel",
      npmScript: "smoke:cancel",
      env: smokeLive ? undefined : { SMOKE_CANCEL_LIVE: "0", SMOKE_CANCEL_DRY_RUN: "1" }
    },
    {
      scenario: "smoke:payment",
      npmScript: "smoke:payment",
      env: smokeLive ? undefined : { SMOKE_PAYMENT_LIVE: "0", SMOKE_PAYMENT_DRY_RUN: "1" }
    },
    {
      scenario: "smoke:inventory",
      npmScript: "smoke:inventory",
      env: smokeLive
        ? { INVENTORY_CONSUME_ENABLE: "1" }
        : { SMOKE_INVENTORY_LIVE: "0", SMOKE_INVENTORY_DRY_RUN: "1", INVENTORY_CONSUME_ENABLE: "1" }
    },
    {
      scenario: "smoke:lifecycle",
      npmScript: "smoke:lifecycle",
      env: smokeLive
        ? { SMOKE_LIFECYCLE_TRACE: "0" }
        : {
          SMOKE_LIFECYCLE_LIVE: "0",
          SMOKE_LIFECYCLE_DRY_RUN: "1",
          SMOKE_LIFECYCLE_TRACE: "0"
        }
    },
    {
      scenario: "smoke:web",
      npmScript: "smoke:web",
      env: smokeLive ? undefined : { WEB_PUBLISH_DRY_RUN: "1" }
    }
  ];

  const smokeRows: SummaryRow[] = [];
  const runId = timestamp;
  for (const [index, smoke] of smokeCommands.entries()) {
    const logPath = path.join(historyDir, `${timestamp}-${sanitizeForFileName(smoke.scenario)}.log`);
    const isolatedChatId = buildIsolatedSmokeChatId({
      runId,
      scenario: smoke.scenario,
      index
    });
    const result = runNpmScript({
      script: smoke.npmScript,
      logPath,
      env: smoke.env
        ? {
          ...smoke.env,
          SMOKE_CHAT_ID: isolatedChatId
        }
        : {
          SMOKE_CHAT_ID: isolatedChatId
        }
    });

    smokeRows.push(
      ...collectSmokeRows({
        scenario: smoke.scenario,
        commandResult: result
      })
    );
  }

  const integrationJsonPath = path.join(historyDir, `${timestamp}-integration-vitest.json`);
  const integrationLogPath = path.join(historyDir, `${timestamp}-integration-vitest.log`);
  const integrationResult = runVitestIntegration({
    outputFile: integrationJsonPath,
    logPath: integrationLogPath
  });
  const integrationRows = collectIntegrationRows({
    jsonReportPath: integrationJsonPath,
    commandResult: integrationResult
  });

  const markdown = buildMarkdown({
    generatedAt,
    smokeMode,
    smokeRows,
    integrationRows
  });

  const historySummaryPath = path.join(historyDir, `${timestamp}-summary.md`);
  const historyJsonPath = path.join(historyDir, `${timestamp}-summary.json`);
  const latestSummaryPath = path.join(reportsDir, "latest-summary.md");
  const latestJsonPath = path.join(reportsDir, "latest-summary.json");

  const payload = {
    generatedAt: generatedAt.toISOString(),
    smokeMode,
    smokeRows,
    integrationRows
  };

  fs.writeFileSync(historySummaryPath, markdown, "utf8");
  fs.writeFileSync(historyJsonPath, JSON.stringify(payload, null, 2), "utf8");
  fs.copyFileSync(historySummaryPath, latestSummaryPath);
  fs.copyFileSync(historyJsonPath, latestJsonPath);

  const totals = summarize([...smokeRows, ...integrationRows]);
  console.log(`Smoke+integration summary generated: ${toRelativePath(latestSummaryPath)}`);
  console.log(`Machine summary JSON: ${toRelativePath(latestJsonPath)}`);
  console.log(`History folder: ${toRelativePath(historyDir)}`);
  console.log(`Summary totals -> Total: ${totals.total}, Passed: ${totals.passed}, Failed: ${totals.failed}`);

  if (totals.failed > 0) {
    process.exitCode = 1;
  }
}

main();

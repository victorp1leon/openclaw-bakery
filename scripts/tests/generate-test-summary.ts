import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

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
  numPendingTests?: number;
  numTodoTests?: number;
  success?: boolean;
  testResults?: VitestSuiteResult[];
};

type SummaryRow = {
  escenario: string;
  caso: string;
  test: string;
  estado: string;
  failureDetail?: string;
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

function toRelativePath(value: string): string {
  const relative = path.relative(process.cwd(), value);
  return relative.length > 0 && !relative.startsWith("..") ? relative : value;
}

function mapStatus(raw: string | undefined): string {
  const value = (raw ?? "").trim().toLowerCase();
  if (value === "passed") return "PASS";
  if (value === "failed") return "FAILED";
  if (value === "pending") return "PENDING";
  if (value === "skipped") return "SKIPPED";
  if (value === "todo") return "TODO";
  return value.length > 0 ? value.toUpperCase() : "UNKNOWN";
}

function escapeCell(value: string): string {
  return value
    .replace(/\|/g, "\\|")
    .replace(/\r?\n/g, "<br/>")
    .trim();
}

function firstFailureLine(failureMessages: string[] | undefined): string | undefined {
  if (!failureMessages || failureMessages.length === 0) return undefined;
  const firstMessage = failureMessages[0] ?? "";
  const firstLine = firstMessage.split("\n")[0]?.trim();
  return firstLine && firstLine.length > 0 ? firstLine : undefined;
}

function toRows(report: VitestJsonReport): SummaryRow[] {
  const rows: SummaryRow[] = [];

  for (const suite of report.testResults ?? []) {
    const escenario = toRelativePath(suite.name ?? "(suite-sin-nombre)");
    for (const assertion of suite.assertionResults ?? []) {
      const ancestorTitles = assertion.ancestorTitles ?? [];
      const caso = ancestorTitles.length > 0 ? ancestorTitles.join(" > ") : "(sin describe)";
      const test = assertion.title?.trim() || assertion.fullName?.trim() || "(test-sin-nombre)";
      rows.push({
        escenario,
        caso,
        test,
        estado: mapStatus(assertion.status),
        failureDetail: firstFailureLine(assertion.failureMessages)
      });
    }
  }

  return rows;
}

function buildMarkdown(args: {
  report: VitestJsonReport;
  rows: SummaryRow[];
  generatedAt: Date;
}): string {
  const total = args.report.numTotalTests ?? args.rows.length;
  const passed = args.report.numPassedTests ?? args.rows.filter((row) => row.estado === "PASS").length;
  const failed = args.report.numFailedTests ?? args.rows.filter((row) => row.estado === "FAILED").length;
  const pending = args.report.numPendingTests ?? args.rows.filter((row) => row.estado === "PENDING").length;
  const todo = args.report.numTodoTests ?? args.rows.filter((row) => row.estado === "TODO").length;

  const lines: string[] = [];
  lines.push("# Test Suite Summary");
  lines.push("");
  lines.push(`Generated at: ${args.generatedAt.toISOString()}`);
  lines.push("");
  lines.push("## Summary");
  lines.push(`Total tests: ${total}`);
  lines.push(`Passed: ${passed}`);
  lines.push(`Failed: ${failed}`);
  lines.push(`Pending: ${pending}`);
  lines.push(`Todo: ${todo}`);
  lines.push("");
  lines.push("## Results");
  lines.push("");
  lines.push("| Escenario | Caso | Test | Estado |");
  lines.push("|---|---|---|---|");

  if (args.rows.length === 0) {
    lines.push("| (sin resultados) | - | - | UNKNOWN |");
  } else {
    for (const row of args.rows) {
      lines.push(
        `| ${escapeCell(row.escenario)} | ${escapeCell(row.caso)} | ${escapeCell(row.test)} | ${escapeCell(row.estado)} |`
      );
    }
  }

  const failedRows = args.rows.filter((row) => row.estado === "FAILED");
  if (failedRows.length > 0) {
    lines.push("");
    lines.push("## Failed Details");
    lines.push("");
    for (const row of failedRows) {
      lines.push(`- ${row.escenario} :: ${row.caso} :: ${row.test}`);
      lines.push(`  - ${row.failureDetail ?? "(sin detalle de falla en reporte json)"}`);
    }
  }

  return `${lines.join("\n")}\n`;
}

function run(): void {
  const generatedAt = new Date();
  const timestamp = formatTimestamp(generatedAt);
  const reportsDir = path.join(process.cwd(), "reports", "test-suite");
  const historyDir = path.join(reportsDir, "history");
  fs.mkdirSync(historyDir, { recursive: true });

  const historyJsonPath = path.join(historyDir, `${timestamp}-vitest.json`);
  const historyMdPath = path.join(historyDir, `${timestamp}-summary.md`);
  const latestJsonPath = path.join(reportsDir, "latest-vitest.json");
  const latestMdPath = path.join(reportsDir, "latest-summary.md");

  const passthroughArgs = process.argv.slice(2);
  const command = process.platform === "win32" ? "npx.cmd" : "npx";
  const vitestArgs = [
    "vitest",
    "run",
    "--reporter=json",
    `--outputFile=${historyJsonPath}`,
    ...passthroughArgs
  ];

  const testRun = spawnSync(command, vitestArgs, {
    stdio: "inherit",
    env: process.env
  });

  if (testRun.error) {
    throw testRun.error;
  }

  if (!fs.existsSync(historyJsonPath)) {
    throw new Error(`test_summary_json_missing:${historyJsonPath}`);
  }

  const raw = fs.readFileSync(historyJsonPath, "utf8");
  const report = JSON.parse(raw) as VitestJsonReport;
  const rows = toRows(report);
  const markdown = buildMarkdown({ report, rows, generatedAt });

  fs.writeFileSync(historyMdPath, markdown, "utf8");
  fs.copyFileSync(historyJsonPath, latestJsonPath);
  fs.copyFileSync(historyMdPath, latestMdPath);

  const total = report.numTotalTests ?? rows.length;
  const passed = report.numPassedTests ?? rows.filter((row) => row.estado === "PASS").length;
  const failed = report.numFailedTests ?? rows.filter((row) => row.estado === "FAILED").length;

  console.log(`\nTest summary generated: ${toRelativePath(latestMdPath)}`);
  console.log(`Raw JSON report: ${toRelativePath(latestJsonPath)}`);
  console.log(`History saved under: ${toRelativePath(historyDir)}`);
  console.log(`Summary totals -> Total: ${total}, Passed: ${passed}, Failed: ${failed}`);

  if (typeof testRun.status === "number" && testRun.status !== 0) {
    process.exitCode = testRun.status;
  } else if (testRun.signal) {
    process.exitCode = 1;
  }
}

run();

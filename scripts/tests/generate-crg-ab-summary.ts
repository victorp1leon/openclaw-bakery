import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

import dotenv from "dotenv";

import { createCodeReviewGraphTool } from "../../src/tools/admin/codeReviewGraph";

type CliArgs = {
  targetFile: string;
  repoRoot: string;
  depth: number;
};

type HeuristicResult = {
  elapsedMs: number;
  reverseRefFiles: string[];
  localImportTargets: string[];
};

type CrgResult = {
  elapsedMs: number;
  status: string;
  summary: string;
  traceRef: string;
  impactedFiles: string[];
  impactedFilesCount: number;
  changedNodesCount: number;
  impactedNodesCount: number;
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

function shellOutput(command: string, args: string[]): string {
  const out = spawnSync(command, args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  if (out.error) return "";
  if ((out.status ?? 0) !== 0) return "";
  return (out.stdout ?? "").trim();
}

function parseArgs(): CliArgs {
  const defaults: CliArgs = {
    targetFile: process.env.CRG_AB_TARGET?.trim() || "src/runtime/conversationProcessor.ts",
    repoRoot: process.env.CRG_AB_REPO_ROOT?.trim() || process.cwd(),
    depth: 2
  };

  const argv = process.argv.slice(2);
  const args: CliArgs = { ...defaults };

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === "--target" && argv[i + 1]) {
      args.targetFile = argv[i + 1];
      i += 1;
      continue;
    }
    if (token === "--repo-root" && argv[i + 1]) {
      args.repoRoot = argv[i + 1];
      i += 1;
      continue;
    }
    if (token === "--depth" && argv[i + 1]) {
      const parsed = Number(argv[i + 1]);
      if (Number.isFinite(parsed) && parsed > 0) {
        args.depth = Math.trunc(parsed);
      }
      i += 1;
    }
  }

  return args;
}

function runHeuristic(targetFile: string): HeuristicResult {
  const started = Date.now();
  const normalizedTarget = targetFile.replace(/\\/g, "/");
  const stem = path.basename(normalizedTarget, path.extname(normalizedTarget));
  const searchRoots = ["src", "scripts", "tests"].filter((entry) => fs.existsSync(path.resolve(process.cwd(), entry)));

  let localImportTargets: string[] = [];
  let exportedSymbols: string[] = [];
  let source = "";
  try {
    source = fs.readFileSync(path.resolve(process.cwd(), normalizedTarget), "utf8");
    const matches = [...source.matchAll(/from\s+["']([^"']+)["']/g)];
    localImportTargets = Array.from(
      new Set(
        matches
          .map((match) => match[1]?.trim())
          .filter((entry): entry is string => Boolean(entry) && entry.startsWith("."))
      )
    ).sort();

    const symbolMatches = [
      ...source.matchAll(/export\s+(?:async\s+)?function\s+([A-Za-z0-9_]+)/g),
      ...source.matchAll(/export\s+const\s+([A-Za-z0-9_]+)/g),
      ...source.matchAll(/export\s+class\s+([A-Za-z0-9_]+)/g)
    ];
    exportedSymbols = Array.from(
      new Set(
        symbolMatches
          .map((match) => match[1]?.trim())
          .filter((entry): entry is string => Boolean(entry))
      )
    );
  } catch {
    localImportTargets = [];
    exportedSymbols = [];
  }

  const searchTokens = Array.from(new Set([stem, ...exportedSymbols])).filter((token) => token.length >= 4);
  const reverseRefSet = new Set<string>();
  for (const token of searchTokens) {
    if (searchRoots.length === 0) break;
    const reverseRefsRaw = shellOutput("rg", [
      "-l",
      token,
      ...searchRoots
    ]);
    for (const line of reverseRefsRaw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed === normalizedTarget) continue;
      reverseRefSet.add(trimmed);
    }
  }
  const reverseRefFiles = Array.from(reverseRefSet).sort();

  void source;
  return {
    elapsedMs: Date.now() - started,
    reverseRefFiles,
    localImportTargets
  };
}

async function runCrg(args: {
  targetFile: string;
  repoRoot: string;
  depth: number;
}): Promise<CrgResult> {
  const tool = createCodeReviewGraphTool();
  const started = Date.now();
  const result = await tool({
    chat_id: "crg-ab",
    operation: "get_impact_radius",
    repo_root: args.repoRoot,
    target_file: args.targetFile,
    max_depth: args.depth
  });
  const elapsedMs = Date.now() - started;
  const data = result.data ?? {};

  const impactedFiles = Array.isArray(data.impacted_files)
    ? data.impacted_files.map((entry) => String(entry))
    : [];

  return {
    elapsedMs,
    status: result.status,
    summary: result.summary,
    traceRef: result.trace_ref,
    impactedFiles,
    impactedFilesCount: Number(data.impacted_files_count ?? impactedFiles.length) || impactedFiles.length,
    changedNodesCount: Number(data.changed_nodes_count ?? 0) || 0,
    impactedNodesCount: Number(data.impacted_nodes_count ?? 0) || 0
  };
}

function buildMarkdown(args: {
  generatedAt: Date;
  cli: CliArgs;
  heuristic: HeuristicResult;
  crg: CrgResult;
  overlapAbsolute: string[];
}): string {
  const lines: string[] = [];
  lines.push("# CRG A/B Summary");
  lines.push("");
  lines.push(`Generated at: ${args.generatedAt.toISOString()}`);
  lines.push(`Target file: ${args.cli.targetFile}`);
  lines.push(`Repo root: ${args.cli.repoRoot}`);
  lines.push(`Depth: ${args.cli.depth}`);
  lines.push("");
  lines.push("## Metrics");
  lines.push("");
  lines.push(`- Heuristic elapsed: ${args.heuristic.elapsedMs}ms`);
  lines.push(`- Heuristic reverse references: ${args.heuristic.reverseRefFiles.length}`);
  lines.push(`- Heuristic local imports: ${args.heuristic.localImportTargets.length}`);
  lines.push(`- CRG elapsed: ${args.crg.elapsedMs}ms`);
  lines.push(`- CRG status: ${args.crg.status}`);
  lines.push(`- CRG impacted files: ${args.crg.impactedFilesCount}`);
  lines.push(`- CRG changed nodes: ${args.crg.changedNodesCount}`);
  lines.push(`- CRG impacted nodes: ${args.crg.impactedNodesCount}`);
  lines.push(`- Overlap (heuristic reverse refs vs CRG impacted files): ${args.overlapAbsolute.length}`);
  lines.push(`- CRG trace_ref: ${args.crg.traceRef}`);
  lines.push("");
  lines.push("## Heuristic Reverse References (Sample)");
  lines.push("");
  if (args.heuristic.reverseRefFiles.length === 0) {
    lines.push("- (none)");
  } else {
    for (const file of args.heuristic.reverseRefFiles.slice(0, 20)) {
      lines.push(`- ${file}`);
    }
  }
  lines.push("");
  lines.push("## CRG Impacted Files (Sample)");
  lines.push("");
  if (args.crg.impactedFiles.length === 0) {
    lines.push("- (none)");
  } else {
    for (const file of args.crg.impactedFiles.slice(0, 20)) {
      lines.push(`- ${toRelativePath(file)}`);
    }
  }
  lines.push("");
  lines.push("## Overlap Files");
  lines.push("");
  if (args.overlapAbsolute.length === 0) {
    lines.push("- (none)");
  } else {
    for (const file of args.overlapAbsolute) {
      lines.push(`- ${toRelativePath(file)}`);
    }
  }
  lines.push("");
  lines.push("## CRG Summary");
  lines.push("");
  lines.push(args.crg.summary);
  lines.push("");
  return `${lines.join("\n")}\n`;
}

async function main(): Promise<void> {
  dotenv.config();

  const cli = parseArgs();
  const generatedAt = new Date();
  const timestamp = formatTimestamp(generatedAt);

  const reportsDir = path.join(process.cwd(), "reports", "crg-ab");
  const historyDir = path.join(reportsDir, "history");
  fs.mkdirSync(historyDir, { recursive: true });

  const heuristic = runHeuristic(cli.targetFile);
  const crg = await runCrg(cli);

  const heuristicAbsolute = heuristic.reverseRefFiles.map((file) => path.resolve(process.cwd(), file));
  const crgSet = new Set(crg.impactedFiles.map((file) => path.resolve(file)));
  const overlapAbsolute = heuristicAbsolute.filter((file) => crgSet.has(file)).sort();

  const payload = {
    generatedAt: generatedAt.toISOString(),
    targetFile: cli.targetFile,
    repoRoot: cli.repoRoot,
    depth: cli.depth,
    heuristic: {
      elapsedMs: heuristic.elapsedMs,
      reverseRefCount: heuristic.reverseRefFiles.length,
      reverseRefFiles: heuristic.reverseRefFiles,
      localImportCount: heuristic.localImportTargets.length,
      localImportTargets: heuristic.localImportTargets
    },
    crg: {
      elapsedMs: crg.elapsedMs,
      status: crg.status,
      summary: crg.summary,
      traceRef: crg.traceRef,
      impactedFilesCount: crg.impactedFilesCount,
      impactedFiles: crg.impactedFiles,
      changedNodesCount: crg.changedNodesCount,
      impactedNodesCount: crg.impactedNodesCount
    },
    overlap: {
      count: overlapAbsolute.length,
      files: overlapAbsolute
    }
  };

  const markdown = buildMarkdown({
    generatedAt,
    cli,
    heuristic,
    crg,
    overlapAbsolute
  });

  const historyJsonPath = path.join(historyDir, `${timestamp}-summary.json`);
  const historyMdPath = path.join(historyDir, `${timestamp}-summary.md`);
  const latestJsonPath = path.join(reportsDir, "latest-summary.json");
  const latestMdPath = path.join(reportsDir, "latest-summary.md");

  fs.writeFileSync(historyJsonPath, JSON.stringify(payload, null, 2), "utf8");
  fs.writeFileSync(historyMdPath, markdown, "utf8");
  fs.copyFileSync(historyJsonPath, latestJsonPath);
  fs.copyFileSync(historyMdPath, latestMdPath);

  console.log(`CRG A/B summary generated: ${toRelativePath(latestMdPath)}`);
  console.log(`Machine summary JSON: ${toRelativePath(latestJsonPath)}`);
  console.log(`History folder: ${toRelativePath(historyDir)}`);
  console.log(
    `Summary metrics -> Heuristic refs: ${heuristic.reverseRefFiles.length}, CRG impacted files: ${crg.impactedFilesCount}, Overlap: ${overlapAbsolute.length}`
  );

  if (crg.status !== "ok") {
    process.exitCode = 1;
  }
}

void main().catch((err: unknown) => {
  const detail = err instanceof Error ? err.message : String(err);
  console.error(`crg_ab_summary_failed:${detail}`);
  process.exitCode = 1;
});

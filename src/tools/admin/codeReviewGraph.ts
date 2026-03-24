import path from "node:path";
import { spawn } from "node:child_process";
import { v4 as uuidv4 } from "uuid";

import { type AppConfig, loadAppConfig } from "../../config/appConfig";

export type CodeReviewGraphOperation = "build_or_update_graph" | "get_impact_radius" | "get_review_context";

export type CodeReviewGraphResultStatus = "ok" | "error";

export type CodeReviewGraphResult = {
  status: CodeReviewGraphResultStatus;
  operation: CodeReviewGraphOperation;
  summary: string;
  detail: string;
  trace_ref: string;
  generated_at: string;
  data: Record<string, unknown>;
  meta: {
    repo_root?: string;
    duration_ms: number;
    timed_out: boolean;
    exit_code: number | null;
    truncated: boolean;
  };
};

export type CodeReviewGraphCommandResult = {
  exitCode: number | null;
  signal: NodeJS.Signals | null;
  stdout: string;
  stderr: string;
  timedOut: boolean;
};

export type CodeReviewGraphCommandRunner = (args: {
  command: string;
  commandArgs: string[];
  stdin: string;
  timeoutMs: number;
  env?: NodeJS.ProcessEnv;
}) => Promise<CodeReviewGraphCommandResult>;

export type CodeReviewGraphToolConfig = {
  config?: AppConfig;
  now?: () => Date;
  newTraceId?: () => string;
  adapterScriptPath?: string;
  commandRunner?: CodeReviewGraphCommandRunner;
};

export type CodeReviewGraphToolInput = {
  chat_id: string;
  operation: CodeReviewGraphOperation;
  repo_root?: string;
  target_file?: string;
  line_number?: number;
  max_depth?: number;
  include_source?: boolean;
  full_rebuild?: boolean;
};

function sanitizeText(value: string): string {
  let out = value
    .replace(
      /\b(token|secret|api[_-]?key|password|authorization)\b\s*[:=]\s*([^\s,;]+)/gi,
      (_match, key: string) => `${key}=[REDACTED]`
    )
    .replace(
      /"([^"]*(?:token|secret|api[_-]?key|password|authorization)[^"]*)"\s*:\s*"[^"]*"/gi,
      (_, key: string) => `"${key}":"[REDACTED]"`
    );

  out = out.replace(/\bAKIA[0-9A-Z]{16}\b/g, "[REDACTED_AWS_ACCESS_KEY_ID]");
  out = out.replace(/\bgh[pousr]_[A-Za-z0-9_]{20,}\b/gi, "[REDACTED_GITHUB_TOKEN]");
  out = out.replace(/\bsk-[A-Za-z0-9][A-Za-z0-9_-]{20,}\b/g, "[REDACTED_API_TOKEN]");
  out = out.replace(/\b(bearer\s+)[A-Za-z0-9._~+/=-]{8,}\b/gi, "$1[REDACTED]");

  return out;
}

function sanitizeValue(value: unknown): unknown {
  if (typeof value === "string") return sanitizeText(value);
  if (Array.isArray(value)) return value.map((entry) => sanitizeValue(entry));
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
      out[key] = sanitizeValue(entry);
    }
    return out;
  }
  return value;
}

function trimString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const out = value.trim();
  return out.length > 0 ? out : undefined;
}

function clampInt(value: unknown, fallback: number, min: number, max: number): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  const rounded = Math.trunc(n);
  if (rounded < min) return min;
  if (rounded > max) return max;
  return rounded;
}

function normalizeRelativePath(filePath: string): string {
  if (filePath.includes("\0")) {
    throw new Error("code_review_graph_target_file_invalid");
  }
  const normalized = path.posix.normalize(filePath.replace(/\\/g, "/")).trim();
  if (!normalized || normalized === "." || normalized.startsWith("/") || normalized === ".." || normalized.startsWith("../")) {
    throw new Error("code_review_graph_target_file_invalid");
  }
  return normalized;
}

function parseAdapterJson(stdout: string): Record<string, unknown> {
  const trimmed = stdout.trim();
  if (!trimmed) {
    throw new Error("code_review_graph_adapter_empty_output");
  }
  try {
    const parsed = JSON.parse(trimmed);
    if (parsed && typeof parsed === "object") return parsed as Record<string, unknown>;
  } catch {
    const lines = trimmed.split(/\r?\n/).reverse();
    for (const line of lines) {
      const candidate = line.trim();
      if (!candidate.startsWith("{")) continue;
      try {
        const parsed = JSON.parse(candidate);
        if (parsed && typeof parsed === "object") return parsed as Record<string, unknown>;
      } catch {
        continue;
      }
    }
  }
  throw new Error("code_review_graph_adapter_invalid_json");
}

function isWithinRoot(rootPath: string, candidatePath: string): boolean {
  const relative = path.relative(rootPath, candidatePath);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function resolveRepoRoot(args: {
  requestedRepoRoot?: string;
  allowlist: string[];
  defaultRepoRoot?: string;
  cwd: string;
}): string {
  if (args.allowlist.length === 0) {
    throw new Error("code_review_graph_repo_allowlist_empty");
  }

  if (!args.requestedRepoRoot) {
    const fallback = args.defaultRepoRoot ?? args.allowlist[0];
    if (!fallback) throw new Error("code_review_graph_repo_root_missing");
    return fallback;
  }

  const requested = args.requestedRepoRoot.trim();
  if (!requested) {
    throw new Error("code_review_graph_repo_root_missing");
  }

  const aliasCandidate = args.allowlist.find((root) => path.basename(root) === requested);
  const resolved = aliasCandidate
    ? aliasCandidate
    : path.resolve(path.isAbsolute(requested) ? requested : path.resolve(args.cwd, requested));

  const allowed = args.allowlist.some((root) => isWithinRoot(root, resolved));
  if (!allowed) {
    throw new Error("code_review_graph_repo_root_not_allowed");
  }

  return resolved;
}

function compactResultData(args: {
  operation: CodeReviewGraphOperation;
  raw: Record<string, unknown>;
}): Record<string, unknown> {
  if (args.operation === "build_or_update_graph") {
    return {
      status: args.raw.status,
      build_type: args.raw.build_type,
      files_parsed: args.raw.files_parsed,
      files_updated: args.raw.files_updated,
      total_nodes: args.raw.total_nodes,
      total_edges: args.raw.total_edges,
      changed_files: args.raw.changed_files,
      dependent_files: args.raw.dependent_files,
      errors_count: Array.isArray(args.raw.errors) ? args.raw.errors.length : 0
    };
  }

  if (args.operation === "get_impact_radius") {
    const impactedFiles = Array.isArray(args.raw.impacted_files) ? args.raw.impacted_files : [];
    const changedNodes = Array.isArray(args.raw.changed_nodes) ? args.raw.changed_nodes : [];
    const impactedNodes = Array.isArray(args.raw.impacted_nodes) ? args.raw.impacted_nodes : [];
    return {
      status: args.raw.status,
      changed_files: args.raw.changed_files,
      changed_nodes_count: changedNodes.length,
      impacted_nodes_count: impactedNodes.length,
      impacted_files_count: impactedFiles.length,
      impacted_files: impactedFiles.slice(0, 20),
      total_impacted: args.raw.total_impacted,
      truncated: args.raw.truncated,
      rejected_paths: args.raw.rejected_paths
    };
  }

  const context = args.raw.context && typeof args.raw.context === "object"
    ? args.raw.context as Record<string, unknown>
    : {};
  const graph = context.graph && typeof context.graph === "object"
    ? context.graph as Record<string, unknown>
    : {};
  const changedNodes = Array.isArray(graph.changed_nodes) ? graph.changed_nodes : [];
  const impactedNodes = Array.isArray(graph.impacted_nodes) ? graph.impacted_nodes : [];
  const impactedFiles = Array.isArray(context.impacted_files) ? context.impacted_files : [];

  return {
    status: args.raw.status,
    changed_files: context.changed_files,
    impacted_files_count: impactedFiles.length,
    impacted_files: impactedFiles.slice(0, 20),
    changed_nodes_count: changedNodes.length,
    impacted_nodes_count: impactedNodes.length,
    rejected_paths: args.raw.rejected_paths ?? context.rejected_paths,
    sensitive_files_omitted_count: Array.isArray(context.sensitive_files_omitted)
      ? context.sensitive_files_omitted.length
      : 0
  };
}

function buildSummary(rawSummary: unknown, fallback: string, maxChars: number): { text: string; truncated: boolean } {
  const sanitized = sanitizeText(trimString(rawSummary) ?? fallback);
  if (sanitized.length <= maxChars) {
    return { text: sanitized, truncated: false };
  }
  return {
    text: `${sanitized.slice(0, Math.max(0, maxChars - 16))}...[truncated]`,
    truncated: true
  };
}

export const runCodeReviewGraphCommand: CodeReviewGraphCommandRunner = async (args) => {
  const command = args.command.trim();
  if (!command) {
    throw new Error("code_review_graph_command_missing");
  }

  return new Promise<CodeReviewGraphCommandResult>((resolve, reject) => {
    const child = spawn(command, args.commandArgs, {
      env: args.env ?? process.env,
      stdio: "pipe"
    });

    let stdout = "";
    let stderr = "";
    let timedOut = false;

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGKILL");
    }, args.timeoutMs);

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");

    child.stdout.on("data", (chunk: string) => {
      stdout += chunk;
    });

    child.stderr.on("data", (chunk: string) => {
      stderr += chunk;
    });

    child.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });

    child.on("close", (exitCode, signal) => {
      clearTimeout(timer);
      resolve({
        exitCode,
        signal,
        stdout,
        stderr,
        timedOut
      });
    });

    child.stdin.write(args.stdin);
    child.stdin.end();
  });
};

export function createCodeReviewGraphTool(config: CodeReviewGraphToolConfig = {}) {
  const appConfig = config.config ?? loadAppConfig();
  const now = config.now ?? (() => new Date());
  const newTraceId = config.newTraceId ?? uuidv4;
  const commandRunner = config.commandRunner ?? runCodeReviewGraphCommand;
  const cwd = process.cwd();
  const adapterScriptPath = path.resolve(
    config.adapterScriptPath ?? path.join(cwd, "scripts/admin/code-review-graph-adapter.py")
  );
  const allowlist = appConfig.codeReviewGraph.repoAllowlist.map((entry) => path.resolve(entry));
  const defaultRepoRoot = trimString(appConfig.codeReviewGraph.defaultRepoRoot)
    ? path.resolve(appConfig.codeReviewGraph.defaultRepoRoot!)
    : undefined;

  return async (args: CodeReviewGraphToolInput): Promise<CodeReviewGraphResult> => {
    void args.chat_id;

    const trace_ref = `code-review-graph:${newTraceId()}`;
    const startedAtMs = now().getTime();
    const generatedAt = now().toISOString();

    const finalize = (payload: {
      status: CodeReviewGraphResultStatus;
      summary: string;
      detail: string;
      data?: Record<string, unknown>;
      repoRoot?: string;
      timedOut?: boolean;
      exitCode?: number | null;
      truncated?: boolean;
    }): CodeReviewGraphResult => ({
      status: payload.status,
      operation: args.operation,
      summary: payload.summary,
      detail: payload.detail,
      trace_ref,
      generated_at: generatedAt,
      data: payload.data ?? {},
      meta: {
        repo_root: payload.repoRoot,
        duration_ms: Math.max(0, now().getTime() - startedAtMs),
        timed_out: payload.timedOut ?? false,
        exit_code: payload.exitCode ?? null,
        truncated: payload.truncated ?? false
      }
    });

    if (!appConfig.codeReviewGraph.enabled) {
      return finalize({
        status: "error",
        summary: "Code Review Graph está deshabilitado en este entorno.",
        detail: "code_review_graph_disabled"
      });
    }

    let repoRoot: string;
    try {
      repoRoot = resolveRepoRoot({
        requestedRepoRoot: args.repo_root,
        allowlist,
        defaultRepoRoot,
        cwd
      });
    } catch (err) {
      const safeDetail = err instanceof Error ? err.message : "code_review_graph_repo_root_invalid";
      return finalize({
        status: "error",
        summary: "El repositorio solicitado no está permitido para Code Review Graph.",
        detail: safeDetail
      });
    }

    if (args.operation !== "build_or_update_graph" && !trimString(args.target_file)) {
      return finalize({
        status: "error",
        summary: "Necesito una ruta de archivo para ejecutar esta operación.",
        detail: "code_review_graph_target_file_required",
        repoRoot
      });
    }

    let targetFile: string | undefined;
    try {
      const rawTarget = trimString(args.target_file);
      if (rawTarget) {
        targetFile = normalizeRelativePath(rawTarget);
        const resolvedTarget = path.resolve(repoRoot, targetFile);
        if (!isWithinRoot(repoRoot, resolvedTarget)) {
          throw new Error("code_review_graph_target_file_outside_repo");
        }
      }
    } catch (err) {
      const safeDetail = err instanceof Error ? err.message : "code_review_graph_target_file_invalid";
      return finalize({
        status: "error",
        summary: "La ruta objetivo no es válida o queda fuera del repositorio permitido.",
        detail: safeDetail,
        repoRoot
      });
    }

    const maxDepth = clampInt(args.max_depth, appConfig.codeReviewGraph.maxDepth, 1, 8);
    const maxLinesPerFile = clampInt(appConfig.codeReviewGraph.maxLinesPerFile, 120, 20, 800);
    const maxSummaryChars = clampInt(appConfig.codeReviewGraph.maxOutputChars, 12000, 400, 50000);
    const includeSource = args.include_source ?? appConfig.codeReviewGraph.includeSourceDefault;

    const payload: Record<string, unknown> = {
      operation: args.operation,
      repo_root: repoRoot,
      base: appConfig.codeReviewGraph.baseRef
    };
    if (args.operation === "build_or_update_graph") {
      payload.full_rebuild = Boolean(args.full_rebuild);
    } else {
      payload.changed_files = targetFile ? [targetFile] : [];
      payload.max_depth = maxDepth;
      if (args.operation === "get_review_context") {
        payload.include_source = includeSource;
        payload.max_lines_per_file = maxLinesPerFile;
      }
    }

    let commandResult: CodeReviewGraphCommandResult;
    try {
      commandResult = await commandRunner({
        command: appConfig.codeReviewGraph.command,
        commandArgs: [...appConfig.codeReviewGraph.commandArgs, adapterScriptPath],
        stdin: JSON.stringify(payload),
        timeoutMs: appConfig.codeReviewGraph.timeoutMs
      });
    } catch (err) {
      const safeDetail = err instanceof Error ? err.message : "code_review_graph_command_failed";
      return finalize({
        status: "error",
        summary: "No se pudo ejecutar el comando de Code Review Graph.",
        detail: sanitizeText(safeDetail),
        repoRoot
      });
    }

    if (commandResult.timedOut) {
      return finalize({
        status: "error",
        summary: "Code Review Graph agotó el tiempo de ejecución.",
        detail: "code_review_graph_timeout",
        repoRoot,
        timedOut: true,
        exitCode: commandResult.exitCode
      });
    }

    if ((commandResult.exitCode ?? 0) !== 0) {
      const stderr = trimString(commandResult.stderr);
      return finalize({
        status: "error",
        summary: "Code Review Graph finalizó con error de ejecución.",
        detail: sanitizeText(stderr ?? "code_review_graph_exit_non_zero"),
        repoRoot,
        exitCode: commandResult.exitCode
      });
    }

    let parsedEnvelope: Record<string, unknown>;
    try {
      parsedEnvelope = parseAdapterJson(commandResult.stdout);
    } catch (err) {
      const safeDetail = err instanceof Error ? err.message : "code_review_graph_adapter_parse_failed";
      return finalize({
        status: "error",
        summary: "La salida del adapter de Code Review Graph no pudo procesarse.",
        detail: sanitizeText(safeDetail),
        repoRoot,
        exitCode: commandResult.exitCode
      });
    }

    if (parsedEnvelope.ok !== true) {
      const errorLabel = trimString(parsedEnvelope.error) ?? "code_review_graph_adapter_error";
      const detail = trimString(parsedEnvelope.detail) ?? errorLabel;
      return finalize({
        status: "error",
        summary: "Code Review Graph devolvió un error controlado.",
        detail: sanitizeText(detail),
        repoRoot,
        exitCode: commandResult.exitCode
      });
    }

    const rawResult = parsedEnvelope.result;
    if (!rawResult || typeof rawResult !== "object") {
      return finalize({
        status: "error",
        summary: "Code Review Graph no devolvió un resultado válido.",
        detail: "code_review_graph_result_invalid",
        repoRoot,
        exitCode: commandResult.exitCode
      });
    }

    const rawResultRecord = rawResult as Record<string, unknown>;
    const compactData = compactResultData({
      operation: args.operation,
      raw: rawResultRecord
    });
    const summaryInfo = buildSummary(
      rawResultRecord.summary,
      `Operación ${args.operation} ejecutada.`,
      Math.min(maxSummaryChars, 900)
    );

    return finalize({
      status: trimString(rawResultRecord.status) === "ok" ? "ok" : "error",
      summary: summaryInfo.text,
      detail: sanitizeText(trimString(rawResultRecord.status) ?? "code_review_graph_completed"),
      data: sanitizeValue(compactData) as Record<string, unknown>,
      repoRoot,
      exitCode: commandResult.exitCode,
      truncated: summaryInfo.truncated
    });
  };
}

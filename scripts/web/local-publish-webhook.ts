import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { spawn } from "node:child_process";
import crypto from "node:crypto";

import dotenv from "dotenv";

dotenv.config();

type IncomingBody = {
  operation_id?: unknown;
  intent?: unknown;
  action?: unknown;
  content?: unknown;
  api_key?: unknown;
};

type JsonRecord = Record<string, unknown>;
type LocalPublishTarget = "local" | "netlify";
type NetlifyDeployResult = {
  deployId: string;
  deployUrl: string;
  state: string;
};
type NetlifyRequestResult = {
  json?: JsonRecord;
  text: string;
};

function isObjectRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readRequestBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = "";
    req.setEncoding("utf8");
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) {
        reject(new Error("payload_too_large"));
        req.destroy();
      }
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

function toNonEmptyString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function toPositiveInt(raw: string | undefined, fallback: number): number {
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.trunc(n) : fallback;
}

function headerValueToString(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) {
    return toNonEmptyString(value[0]);
  }
  return toNonEmptyString(value);
}

function normalizeLocalTarget(raw: string | undefined): LocalPublishTarget {
  const value = raw?.trim().toLowerCase();
  return value === "netlify" ? "netlify" : "local";
}

function sleep(ms: number): Promise<void> {
  if (ms <= 0) return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function writeJson(res: http.ServerResponse, status: number, payload: JsonRecord) {
  res.statusCode = status;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
}

function runBuild(timeoutMs: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn("npm", ["run", "web:build"], {
      stdio: "pipe",
      env: process.env
    });

    let stderr = "";
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error("local_publish_build_timeout"));
    }, timeoutMs);

    child.stderr.setEncoding("utf8");
    child.stderr.on("data", (chunk: string) => {
      stderr += chunk;
    });

    child.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });

    child.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`local_publish_build_failed:${code}:${stderr.slice(0, 400)}`));
    });
  });
}

function listFilesRecursive(baseDir: string, currentDir: string = baseDir): string[] {
  const entries = fs.readdirSync(currentDir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const absPath = path.join(currentDir, entry.name);
    if (entry.isDirectory()) {
      files.push(...listFilesRecursive(baseDir, absPath));
      continue;
    }
    if (!entry.isFile()) continue;
    const relative = path.relative(baseDir, absPath).split(path.sep).join("/");
    files.push(relative);
  }

  return files.sort();
}

function toNetlifyManifestPath(relativePath: string): string {
  const normalized = relativePath.replace(/^\/+/, "").replace(/\\/g, "/");
  return `/${normalized}`;
}

function toSha1Hex(buffer: Buffer): string {
  return crypto.createHash("sha1").update(buffer).digest("hex");
}

function parseJsonRecordFromText(text: string): JsonRecord | undefined {
  if (!text) return undefined;
  try {
    const parsed = JSON.parse(text);
    if (isObjectRecord(parsed)) return parsed;
    return undefined;
  } catch {
    return undefined;
  }
}

function isSha1Hex(value: string): boolean {
  return /^[a-f0-9]{40}$/i.test(value);
}

function isLikelyDeployPath(value: string): boolean {
  return value.startsWith("/") || value.includes("/") || value.includes(".");
}

function compactTextSnippet(value: string, maxLen: number): string | undefined {
  const compact = value.replace(/\s+/g, " ").trim();
  if (!compact) return undefined;
  return compact.slice(0, maxLen);
}

function toNetlifyErrorToken(value: unknown): string {
  if (typeof value !== "string") return "unknown";
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return normalized || "unknown";
}

async function netlifyRequest(args: {
  method: "GET" | "POST" | "PUT";
  url: string;
  apiToken: string;
  body?: string | Buffer;
  contentType?: string;
}): Promise<NetlifyRequestResult> {
  if (typeof fetch !== "function") {
    throw new Error("netlify_fetch_unavailable");
  }

  const headers: Record<string, string> = {
    authorization: `Bearer ${args.apiToken}`
  };
  if (args.contentType) {
    headers["content-type"] = args.contentType;
  }

  const response = await fetch(args.url, {
    method: args.method,
    headers,
    body: args.body
  });

  const text = await response.text();
  const json = parseJsonRecordFromText(text);
  if (!response.ok) {
    const errorToken = toNetlifyErrorToken(
      json?.code ?? json?.error ?? json?.message ?? json?.description ?? `${response.status}`
    );
    const snippet = compactTextSnippet(text, 240);
    throw new Error(`netlify_http_${response.status}_${errorToken}${snippet ? `:${snippet}` : ""}`);
  }

  return { json, text };
}

function toDeployUrl(payload?: JsonRecord): string | undefined {
  if (!payload) return undefined;
  return (
    toNonEmptyString(payload.deploy_ssl_url) ??
    toNonEmptyString(payload.ssl_url) ??
    toNonEmptyString(payload.deploy_url) ??
    toNonEmptyString(payload.url)
  );
}

function resolveDistFilePath(distDir: string, deployPath: string): string {
  const stripped = deployPath.replace(/^\/+/, "");
  const resolvedDistDir = path.resolve(distDir);
  const resolvedFilePath = path.resolve(resolvedDistDir, stripped);

  if (
    resolvedFilePath !== resolvedDistDir &&
    !resolvedFilePath.startsWith(`${resolvedDistDir}${path.sep}`)
  ) {
    throw new Error("netlify_upload_path_invalid");
  }

  return resolvedFilePath;
}

function parseRequiredPaths(args: {
  requiredRaw: unknown;
  fallbackManifestPaths: string[];
  manifestBySha: Map<string, string[]>;
}): string[] {
  const fallbackPaths = [...args.fallbackManifestPaths];
  if (!Array.isArray(requiredRaw)) {
    return fallbackPaths;
  }

  const normalized = new Set<string>();
  for (const item of requiredRaw) {
    const value = toNonEmptyString(item);
    if (!value) continue;

    if (isSha1Hex(value)) {
      const mappedPaths = args.manifestBySha.get(value.toLowerCase());
      if (!mappedPaths || mappedPaths.length === 0) {
        throw new Error("netlify_required_hash_unmapped");
      }
      normalized.add(mappedPaths[0]!);
      continue;
    }

    if (isLikelyDeployPath(value)) {
      normalized.add(value.startsWith("/") ? value : `/${value}`);
      continue;
    }

    const mappedPaths = args.manifestBySha.get(value.toLowerCase());
    if (mappedPaths && mappedPaths.length > 0) {
      normalized.add(mappedPaths[0]!);
      continue;
    }

    throw new Error("netlify_required_entry_invalid");
  }

  return normalized.size > 0 ? [...normalized] : fallbackPaths;
}

function normalizeApiBaseUrl(raw: string | undefined): string {
  return (raw?.trim() || "https://api.netlify.com/api/v1").replace(/\/+$/, "");
}

async function deployDistToNetlify(args: {
  distDir: string;
  siteId: string;
  apiToken: string;
  apiBaseUrl: string;
  pollTimeoutMs: number;
  pollIntervalMs: number;
}): Promise<NetlifyDeployResult> {
  const files = listFilesRecursive(args.distDir);
  if (files.length === 0) {
    throw new Error("netlify_dist_empty");
  }

  const manifest: Record<string, string> = {};
  const manifestBySha = new Map<string, string[]>();
  for (const relativeFilePath of files) {
    const absPath = path.join(args.distDir, relativeFilePath);
    const buffer = fs.readFileSync(absPath);
    const deployPath = toNetlifyManifestPath(relativeFilePath);
    const sha = toSha1Hex(buffer);
    manifest[deployPath] = sha;
    const key = sha.toLowerCase();
    const existing = manifestBySha.get(key) ?? [];
    existing.push(deployPath);
    manifestBySha.set(key, existing);
  }

  const createUrl = `${args.apiBaseUrl}/sites/${encodeURIComponent(args.siteId)}/deploys`;
  const createResult = await netlifyRequest({
    method: "POST",
    url: createUrl,
    apiToken: args.apiToken,
    contentType: "application/json; charset=utf-8",
    body: JSON.stringify({ files: manifest })
  });

  const deployPayload = createResult.json;
  const deployId = toNonEmptyString(deployPayload?.id);
  if (!deployId) {
    throw new Error("netlify_deploy_id_missing");
  }

  const manifestPaths = Object.keys(manifest);
  const requiredPaths = parseRequiredPaths({
    requiredRaw: deployPayload?.required,
    fallbackManifestPaths: manifestPaths,
    manifestBySha
  });

  for (const deployPath of requiredPaths) {
    const absPath = resolveDistFilePath(args.distDir, deployPath);
    if (!fs.existsSync(absPath) || !fs.statSync(absPath).isFile()) {
      throw new Error("netlify_upload_file_missing");
    }

    const uploadBody = fs.readFileSync(absPath);
    const uploadPath = deployPath.replace(/^\/+/, "");
    if (!uploadPath) {
      throw new Error("netlify_upload_path_invalid");
    }

    const uploadPathEncoded = uploadPath
      .split("/")
      .filter((segment) => segment.length > 0)
      .map((segment) => encodeURIComponent(segment))
      .join("/");
    const uploadUrl = `${args.apiBaseUrl}/deploys/${encodeURIComponent(deployId)}/files/${uploadPathEncoded}`;
    await netlifyRequest({
      method: "PUT",
      url: uploadUrl,
      apiToken: args.apiToken,
      contentType: "application/octet-stream",
      body: uploadBody
    });
  }

  const deadline = Date.now() + Math.max(args.pollTimeoutMs, 1_000);
  let latestPayload = deployPayload;
  while (Date.now() <= deadline) {
    const state = toNonEmptyString(latestPayload?.state)?.toLowerCase();
    if (state === "ready") {
      return {
        deployId,
        deployUrl: toDeployUrl(latestPayload) || `https://${args.siteId}.netlify.app`,
        state
      };
    }
    if (state === "error") {
      throw new Error("netlify_deploy_failed");
    }

    await sleep(args.pollIntervalMs);
    const statusUrl = `${args.apiBaseUrl}/deploys/${encodeURIComponent(deployId)}`;
    const statusResult = await netlifyRequest({
      method: "GET",
      url: statusUrl,
      apiToken: args.apiToken
    });
    latestPayload = statusResult.json;
  }

  throw new Error("netlify_deploy_timeout");
}

async function main() {
  const host = process.env.WEB_LOCAL_PUBLISH_HOST?.trim() || "127.0.0.1";
  const port = toPositiveInt(process.env.WEB_LOCAL_PUBLISH_PORT, 8787);
  const routePath = process.env.WEB_LOCAL_PUBLISH_PATH?.trim() || "/web/publish";
  const target = normalizeLocalTarget(process.env.WEB_LOCAL_PUBLISH_TARGET);
  const apiKey =
    process.env.WEB_LOCAL_PUBLISH_API_KEY?.trim() ||
    process.env.WEB_PUBLISH_API_KEY?.trim() ||
    "dev-local-webhook-key";
  const apiKeyHeader = process.env.WEB_PUBLISH_API_KEY_HEADER?.trim() || "x-api-key";
  const buildTimeoutMs = toPositiveInt(process.env.WEB_LOCAL_PUBLISH_BUILD_TIMEOUT_MS, 20000);

  const contentPath =
    process.env.WEB_LOCAL_PUBLISH_CONTENT_PATH?.trim() || process.env.WEB_CONTENT_PATH?.trim() || "site/CONTENT.json";
  const resolvedContentPath = path.resolve(process.cwd(), contentPath);
  const distPath = process.env.WEB_LOCAL_PUBLISH_DIST_PATH?.trim() || "site/dist";
  const resolvedDistPath = path.resolve(process.cwd(), distPath);

  const netlifySiteId = process.env.WEB_LOCAL_PUBLISH_NETLIFY_SITE_ID?.trim() || process.env.NETLIFY_SITE_ID?.trim();
  const netlifyApiToken =
    process.env.WEB_LOCAL_PUBLISH_NETLIFY_API_TOKEN?.trim() || process.env.NETLIFY_API_TOKEN?.trim();
  const netlifyApiBaseUrl = normalizeApiBaseUrl(process.env.WEB_LOCAL_PUBLISH_NETLIFY_API_BASE_URL);
  const netlifyPollTimeoutMs = toPositiveInt(process.env.WEB_LOCAL_PUBLISH_NETLIFY_POLL_TIMEOUT_MS, 120000);
  const netlifyPollIntervalMs = toPositiveInt(process.env.WEB_LOCAL_PUBLISH_NETLIFY_POLL_INTERVAL_MS, 2000);

  const server = http.createServer(async (req, res) => {
    try {
      if (req.method === "GET" && req.url === "/health") {
        writeJson(res, 200, { ok: true, service: "local-web-publish-webhook" });
        return;
      }

      if (req.method !== "POST" || req.url !== routePath) {
        writeJson(res, 404, { ok: false, error: "not_found" });
        return;
      }

      const rawBody = await readRequestBody(req);
      let parsed: unknown = {};
      if (rawBody.length > 0) {
        try {
          parsed = JSON.parse(rawBody);
        } catch {
          writeJson(res, 400, { ok: false, error: "invalid_json" });
          return;
        }
      }
      if (!isObjectRecord(parsed)) {
        writeJson(res, 400, { ok: false, error: "invalid_payload" });
        return;
      }

      const body = parsed as IncomingBody;
      const headerKey = headerValueToString(req.headers[apiKeyHeader.toLowerCase()]);
      const bodyKey = toNonEmptyString(body.api_key);

      if (headerKey !== apiKey && bodyKey !== apiKey) {
        writeJson(res, 401, { ok: false, error: "unauthorized" });
        return;
      }

      const action = toNonEmptyString(body.action);
      if (action !== "crear" && action !== "menu" && action !== "publicar") {
        writeJson(res, 400, { ok: false, error: "invalid_action" });
        return;
      }

      if (body.intent !== undefined && body.intent !== "web") {
        writeJson(res, 400, { ok: false, error: "invalid_intent" });
        return;
      }

      const incomingContent = body.content;
      if ((action === "crear" || action === "menu") && !isObjectRecord(incomingContent)) {
        writeJson(res, 400, { ok: false, error: "content_required" });
        return;
      }

      if (isObjectRecord(incomingContent)) {
        fs.mkdirSync(path.dirname(resolvedContentPath), { recursive: true });
        fs.writeFileSync(resolvedContentPath, `${JSON.stringify(incomingContent, null, 2)}\n`, "utf8");
      }

      await runBuild(buildTimeoutMs);

      const operationId = toNonEmptyString(body.operation_id) || `local-web-${Date.now()}`;
      let deployId = operationId;
      let deployUrl = "local://site/dist/index.html";
      let detail = "local_build_ready";

      if (target === "netlify") {
        if (!netlifySiteId || !netlifyApiToken) {
          writeJson(res, 500, { ok: false, error: "netlify_config_missing" });
          return;
        }
        const netlifyResult = await deployDistToNetlify({
          distDir: resolvedDistPath,
          siteId: netlifySiteId,
          apiToken: netlifyApiToken,
          apiBaseUrl: netlifyApiBaseUrl,
          pollTimeoutMs: netlifyPollTimeoutMs,
          pollIntervalMs: netlifyPollIntervalMs
        });
        deployId = netlifyResult.deployId;
        deployUrl = netlifyResult.deployUrl;
        detail = `netlify_${netlifyResult.state}`;
      }

      writeJson(res, 200, {
        ok: true,
        deploy_id: deployId,
        deploy_url: deployUrl,
        detail,
        target
      });
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      writeJson(res, 500, { ok: false, error: "local_publish_failed", detail });
    }
  });

  server.listen(port, host, () => {
    console.log(
      JSON.stringify(
        {
          event: "local_web_publish_webhook_started",
          host,
          port,
          routePath,
          target,
          apiKeyHeader,
          contentPath: resolvedContentPath,
          distPath: resolvedDistPath,
          netlifyConfigured: Boolean(netlifySiteId && netlifyApiToken),
          netlifyApiBaseUrl
        },
        null,
        2
      )
    );
  });
}

void main().catch((err: unknown) => {
  const detail = err instanceof Error ? err.message : String(err);
  console.error(JSON.stringify({ event: "local_web_publish_webhook_failed", detail }, null, 2));
  process.exitCode = 1;
});

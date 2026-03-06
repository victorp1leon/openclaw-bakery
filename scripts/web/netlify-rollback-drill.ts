import dotenv from "dotenv";

dotenv.config();

type JsonRecord = Record<string, unknown>;

type NetlifyDeploy = {
  id: string;
  state?: string;
  context?: string;
  created_at?: string;
  published_at?: string;
  deploy_ssl_url?: string;
};

type NetlifySite = {
  id: string;
  name?: string;
  url?: string;
  ssl_url?: string;
  published_deploy?: NetlifyDeploy;
};

type RestoreResult = {
  deployId: string;
  publishedAt?: string;
  deployUrl?: string;
  elapsedMs: number;
};

function isObjectRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
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

function toErrorToken(value: unknown): string {
  if (typeof value !== "string") return "unknown";
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return normalized || "unknown";
}

function compactSnippet(text: string, maxLen: number): string | undefined {
  const compact = text.replace(/\s+/g, " ").trim();
  if (!compact) return undefined;
  return compact.slice(0, maxLen);
}

function normalizeApiBaseUrl(raw: string | undefined): string {
  return (raw?.trim() || "https://api.netlify.com/api/v1").replace(/\/+$/, "");
}

function toDeploy(args: JsonRecord): NetlifyDeploy | undefined {
  const id = toNonEmptyString(args.id);
  if (!id) return undefined;
  return {
    id,
    state: toNonEmptyString(args.state),
    context: toNonEmptyString(args.context),
    created_at: toNonEmptyString(args.created_at),
    published_at: toNonEmptyString(args.published_at),
    deploy_ssl_url: toNonEmptyString(args.deploy_ssl_url)
  };
}

function assertFetchAvailable(): void {
  if (typeof fetch !== "function") {
    throw new Error("netlify_fetch_unavailable");
  }
}

async function netlifyRequest(args: {
  method: "GET" | "POST";
  url: string;
  apiToken: string;
}): Promise<JsonRecord | JsonRecord[]> {
  assertFetchAvailable();

  const response = await fetch(args.url, {
    method: args.method,
    headers: {
      authorization: `Bearer ${args.apiToken}`
    }
  });

  const text = await response.text();
  let parsed: unknown;
  if (text.length > 0) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = undefined;
    }
  }

  if (!response.ok) {
    const errorToken = isObjectRecord(parsed)
      ? toErrorToken(parsed.code ?? parsed.error ?? parsed.message ?? parsed.description ?? `${response.status}`)
      : toErrorToken(`${response.status}`);
    const snippet = compactSnippet(text, 240);
    throw new Error(`netlify_http_${response.status}_${errorToken}${snippet ? `:${snippet}` : ""}`);
  }

  if (Array.isArray(parsed)) {
    const records = parsed.filter((item) => isObjectRecord(item)) as JsonRecord[];
    return records;
  }

  if (isObjectRecord(parsed)) {
    return parsed;
  }

  return {};
}

async function fetchSite(args: { apiBaseUrl: string; apiToken: string; siteId: string }): Promise<NetlifySite> {
  const payload = await netlifyRequest({
    method: "GET",
    url: `${args.apiBaseUrl}/sites/${encodeURIComponent(args.siteId)}`,
    apiToken: args.apiToken
  });
  if (!isObjectRecord(payload)) {
    throw new Error("netlify_site_payload_invalid");
  }

  const id = toNonEmptyString(payload.id);
  if (!id) {
    throw new Error("netlify_site_id_missing");
  }

  const published = isObjectRecord(payload.published_deploy) ? toDeploy(payload.published_deploy) : undefined;

  return {
    id,
    name: toNonEmptyString(payload.name),
    url: toNonEmptyString(payload.url),
    ssl_url: toNonEmptyString(payload.ssl_url),
    published_deploy: published
  };
}

async function fetchReadyDeploys(args: {
  apiBaseUrl: string;
  apiToken: string;
  siteId: string;
  perPage: number;
}): Promise<NetlifyDeploy[]> {
  const payload = await netlifyRequest({
    method: "GET",
    url: `${args.apiBaseUrl}/sites/${encodeURIComponent(args.siteId)}/deploys?per_page=${args.perPage}`,
    apiToken: args.apiToken
  });
  if (!Array.isArray(payload)) {
    throw new Error("netlify_deploy_list_invalid");
  }

  const deploys: NetlifyDeploy[] = [];
  for (const item of payload) {
    const deploy = toDeploy(item);
    if (!deploy) continue;
    if (deploy.state !== "ready") continue;
    if (deploy.context && deploy.context !== "production") continue;
    deploys.push(deploy);
  }
  return deploys;
}

async function restoreDeploy(args: {
  apiBaseUrl: string;
  apiToken: string;
  deployId: string;
}): Promise<RestoreResult> {
  const t0 = Date.now();
  const payload = await netlifyRequest({
    method: "POST",
    url: `${args.apiBaseUrl}/deploys/${encodeURIComponent(args.deployId)}/restore`,
    apiToken: args.apiToken
  });
  const t1 = Date.now();

  if (!isObjectRecord(payload)) {
    throw new Error("netlify_restore_payload_invalid");
  }

  const deployId = toNonEmptyString(payload.id);
  if (!deployId) {
    throw new Error("netlify_restore_id_missing");
  }

  return {
    deployId,
    publishedAt: toNonEmptyString(payload.published_at) ?? toNonEmptyString(payload.updated_at),
    deployUrl: toNonEmptyString(payload.deploy_ssl_url),
    elapsedMs: t1 - t0
  };
}

function pickRollbackTarget(args: {
  readyDeploys: NetlifyDeploy[];
  currentDeployId: string;
  requestedTargetId?: string;
}): NetlifyDeploy {
  if (args.requestedTargetId) {
    const requested = args.readyDeploys.find((item) => item.id === args.requestedTargetId);
    if (!requested) {
      throw new Error("web_rollback_drill_target_not_found");
    }
    if (requested.id === args.currentDeployId) {
      throw new Error("web_rollback_drill_target_matches_current");
    }
    return requested;
  }

  const target = args.readyDeploys.find((item) => item.id !== args.currentDeployId);
  if (!target) {
    throw new Error("web_rollback_drill_no_alternate_deploy");
  }
  return target;
}

function parseRestoreMode(raw: string | undefined): "original" | "latest" {
  const value = raw?.trim().toLowerCase();
  return value === "latest" ? "latest" : "original";
}

async function main() {
  const confirm = process.env.WEB_ROLLBACK_DRILL_CONFIRM === "1";
  if (!confirm) {
    throw new Error("web_rollback_drill_confirmation_required:set_WEB_ROLLBACK_DRILL_CONFIRM=1");
  }

  const siteId = process.env.NETLIFY_SITE_ID?.trim();
  const apiToken = process.env.NETLIFY_API_TOKEN?.trim();
  if (!siteId) throw new Error("netlify_site_id_missing");
  if (!apiToken) throw new Error("netlify_api_token_missing");

  const apiBaseUrl = normalizeApiBaseUrl(process.env.WEB_LOCAL_PUBLISH_NETLIFY_API_BASE_URL);
  const perPage = toPositiveInt(process.env.WEB_ROLLBACK_DRILL_PER_PAGE, 10);
  const requestedTargetId = process.env.WEB_ROLLBACK_DRILL_TARGET_DEPLOY_ID?.trim() || undefined;
  const restoreMode = parseRestoreMode(process.env.WEB_ROLLBACK_DRILL_RESTORE_MODE);

  console.log(
    JSON.stringify(
      {
        event: "web_rollback_drill_start",
        siteId,
        apiBaseUrl,
        perPage,
        restoreMode,
        requestedTargetId: requestedTargetId ?? null
      },
      null,
      2
    )
  );

  const siteBefore = await fetchSite({ apiBaseUrl, apiToken, siteId });
  const originalDeployId = siteBefore.published_deploy?.id;
  if (!originalDeployId) {
    throw new Error("web_rollback_drill_current_deploy_missing");
  }

  const readyDeploys = await fetchReadyDeploys({ apiBaseUrl, apiToken, siteId, perPage });
  const rollbackTarget = pickRollbackTarget({
    readyDeploys,
    currentDeployId: originalDeployId,
    requestedTargetId
  });

  const finalRestoreDeployId = restoreMode === "latest" ? readyDeploys[0]?.id ?? originalDeployId : originalDeployId;

  const rollbackResult = await restoreDeploy({
    apiBaseUrl,
    apiToken,
    deployId: rollbackTarget.id
  });
  const siteAfterRollback = await fetchSite({ apiBaseUrl, apiToken, siteId });
  if (siteAfterRollback.published_deploy?.id !== rollbackTarget.id) {
    throw new Error("web_rollback_drill_verify_rollback_failed");
  }

  const rollforwardResult = await restoreDeploy({
    apiBaseUrl,
    apiToken,
    deployId: finalRestoreDeployId
  });
  const siteAfterRollforward = await fetchSite({ apiBaseUrl, apiToken, siteId });
  if (siteAfterRollforward.published_deploy?.id !== finalRestoreDeployId) {
    throw new Error("web_rollback_drill_verify_rollforward_failed");
  }

  console.log(
    JSON.stringify(
      {
        event: "web_rollback_drill_result",
        ok: true,
        site: {
          id: siteBefore.id,
          name: siteBefore.name,
          url: siteBefore.ssl_url ?? siteBefore.url
        },
        before: {
          publishedDeployId: originalDeployId
        },
        rollback: {
          targetDeployId: rollbackTarget.id,
          publishedDeployId: siteAfterRollback.published_deploy?.id,
          elapsedMs: rollbackResult.elapsedMs,
          publishedAt: rollbackResult.publishedAt,
          deployUrl: rollbackResult.deployUrl
        },
        rollforward: {
          targetDeployId: finalRestoreDeployId,
          publishedDeployId: siteAfterRollforward.published_deploy?.id,
          elapsedMs: rollforwardResult.elapsedMs,
          publishedAt: rollforwardResult.publishedAt,
          deployUrl: rollforwardResult.deployUrl
        }
      },
      null,
      2
    )
  );
}

void main().catch((err: unknown) => {
  const detail = err instanceof Error ? err.message : String(err);
  console.error(JSON.stringify({ event: "web_rollback_drill_failed", detail }, null, 2));
  process.exitCode = 1;
});

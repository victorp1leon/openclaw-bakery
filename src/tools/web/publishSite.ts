import type { ToolExecutionResult } from "../types";

type FetchLike = (input: string | URL, init?: RequestInit) => Promise<{
  ok: boolean;
  status: number;
  json?: () => Promise<unknown>;
  text?: () => Promise<string>;
}>;

export type WebAction = "crear" | "menu" | "publicar";
export type WebImageSource = "facebook" | "manual";

export type WebMenuItem = {
  nombre: string;
  descripcion?: string;
  precio: number;
};

export type WebCatalogItem = {
  id: string;
  nombre: string;
  descripcion?: string;
  precio: number;
  categoria?: string;
  imageUrl: string;
  imageSource: WebImageSource;
};

export type WebContentProfile = Record<string, unknown> & {
  businessName?: string;
  whatsapp?: string;
  zones?: string[];
  menuItems?: WebMenuItem[];
  catalogItems?: WebCatalogItem[];
  brandStyle?: Record<string, unknown>;
  cta?: string;
  gallery?: string[];
  facebookPageUrl?: string;
};

export type WebPublishPayload = {
  action: WebAction;
  content?: WebContentProfile;
};

export type PublishSiteToolConfig = {
  fetchFn?: FetchLike;
  webhookUrl?: string;
  apiKey?: string;
  apiKeyHeader?: string;
  timeoutMs?: number;
  maxRetries?: number;
  dryRunDefault?: boolean;
  retryBackoffMs?: number;
  allowedImageDomains?: string[];
  facebookPageUrl?: string;
};

type WebPublishWebhookPayload = {
  operation_id: string;
  intent: "web";
  action: WebAction;
  web: {
    action: WebAction;
    content?: WebContentProfile;
    facebook_page_url?: string;
  };
  content?: WebContentProfile;
  timestamp: string;
};

function sleep(ms: number): Promise<void> {
  if (ms <= 0) return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toNonEmptyString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function sanitizeErrorToken(value: unknown): string {
  if (typeof value !== "string") return "unknown";
  const normalized = value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  return normalized || "unknown";
}

function classifyTransportError(err: unknown): "timeout" | "network" | "other" {
  if (err instanceof Error && err.name === "AbortError") return "timeout";
  if (err instanceof TypeError) return "network";
  return "other";
}

function isRetriableHttpStatus(status: number): boolean {
  return status === 429 || status >= 500;
}

function isHtmlText(value: string): boolean {
  const t = value.trim().toLowerCase();
  return t.startsWith("<!doctype html") || t.startsWith("<html");
}

function normalizeDomains(domains?: string[]): string[] {
  const unique = new Set<string>();
  for (const raw of domains ?? []) {
    const normalized = raw.trim().toLowerCase().replace(/^\.+/, "");
    if (normalized.length > 0) unique.add(normalized);
  }
  return [...unique];
}

function isAllowedHost(hostname: string, allowedDomains: string[]): boolean {
  const host = hostname.trim().toLowerCase();
  return allowedDomains.some((domain) => host === domain || host.endsWith(`.${domain}`));
}

function sanitizeMediaUrl(raw: string): string {
  const url = new URL(raw);
  if (url.protocol !== "https:") {
    throw new Error("web_publish_image_url_invalid");
  }

  url.search = "";
  url.hash = "";
  return url.toString();
}

function requireObjectContent(content: unknown): WebContentProfile {
  if (!isObjectRecord(content)) {
    throw new Error("web_publish_content_invalid");
  }
  return { ...content } as WebContentProfile;
}

function validateMenuItems(value: unknown): WebMenuItem[] {
  if (!Array.isArray(value)) return [];

  const normalized: WebMenuItem[] = [];
  for (const item of value) {
    if (!isObjectRecord(item)) {
      throw new Error("web_publish_menu_item_invalid");
    }

    const nombre = toNonEmptyString(item.nombre);
    const precio = Number(item.precio);
    if (!nombre || !Number.isFinite(precio) || precio < 0) {
      throw new Error("web_publish_menu_item_invalid");
    }

    normalized.push({
      nombre,
      descripcion: toNonEmptyString(item.descripcion),
      precio
    });
  }

  return normalized;
}

function validateCatalogItems(args: { value: unknown; allowedImageDomains: string[] }): WebCatalogItem[] {
  if (!Array.isArray(args.value)) return [];

  const normalized: WebCatalogItem[] = [];
  for (const item of args.value) {
    if (!isObjectRecord(item)) {
      throw new Error("web_publish_catalog_item_invalid");
    }

    const id = toNonEmptyString(item.id);
    const nombre = toNonEmptyString(item.nombre);
    const precio = Number(item.precio);
    const rawUrl = toNonEmptyString(item.imageUrl);
    const imageSourceRaw = toNonEmptyString(item.imageSource)?.toLowerCase();
    const imageSource: WebImageSource | undefined =
      imageSourceRaw === "facebook" || imageSourceRaw === "manual" ? (imageSourceRaw as WebImageSource) : undefined;

    if (!id || !nombre || !rawUrl || !imageSource || !Number.isFinite(precio) || precio < 0) {
      throw new Error("web_publish_catalog_item_invalid");
    }

    let imageUrl: string;
    try {
      imageUrl = sanitizeMediaUrl(rawUrl);
    } catch {
      throw new Error("web_publish_image_url_invalid");
    }

    const parsed = new URL(imageUrl);
    if (!isAllowedHost(parsed.hostname, args.allowedImageDomains)) {
      throw new Error("web_publish_image_domain_not_allowed");
    }

    normalized.push({
      id,
      nombre,
      descripcion: toNonEmptyString(item.descripcion),
      precio,
      categoria: toNonEmptyString(item.categoria),
      imageUrl,
      imageSource
    });
  }

  return normalized;
}

function validateGallery(args: { value: unknown; allowedImageDomains: string[] }): string[] | undefined {
  if (!Array.isArray(args.value)) return undefined;

  const sanitized: string[] = [];
  for (const item of args.value) {
    const raw = toNonEmptyString(item);
    if (!raw) continue;
    let url: string;
    try {
      url = sanitizeMediaUrl(raw);
    } catch {
      throw new Error("web_publish_image_url_invalid");
    }
    const parsed = new URL(url);
    if (!isAllowedHost(parsed.hostname, args.allowedImageDomains)) {
      throw new Error("web_publish_image_domain_not_allowed");
    }
    sanitized.push(url);
  }

  return sanitized.length > 0 ? sanitized : undefined;
}

function validateAndNormalizePayload(args: {
  payload: WebPublishPayload;
  allowedImageDomains: string[];
  facebookPageUrl?: string;
}): { action: WebAction; content?: WebContentProfile; facebookPageUrl?: string } {
  const action = args.payload.action;
  if (action !== "crear" && action !== "menu" && action !== "publicar") {
    throw new Error("web_publish_action_invalid");
  }

  if (!args.payload.content) {
    if (action === "publicar") {
      return { action };
    }
    throw new Error("web_publish_content_missing");
  }

  const rawContent = requireObjectContent(args.payload.content);
  const content: WebContentProfile = { ...rawContent };

  const businessName = toNonEmptyString(content.businessName);
  const whatsapp = toNonEmptyString(content.whatsapp);
  if (action === "crear") {
    if (!businessName) throw new Error("web_publish_business_name_missing");
    if (!whatsapp) throw new Error("web_publish_whatsapp_missing");
  }

  const menuItems = validateMenuItems(content.menuItems);
  const catalogItems = validateCatalogItems({
    value: content.catalogItems,
    allowedImageDomains: args.allowedImageDomains
  });

  if (action === "menu" && menuItems.length === 0 && catalogItems.length === 0) {
    throw new Error("web_publish_menu_content_missing");
  }

  const gallery = validateGallery({
    value: content.gallery,
    allowedImageDomains: args.allowedImageDomains
  });

  if (content.menuItems !== undefined) content.menuItems = menuItems;
  if (content.catalogItems !== undefined) content.catalogItems = catalogItems;
  if (content.gallery !== undefined) {
    if (gallery) content.gallery = gallery;
    else delete content.gallery;
  }
  if (businessName) content.businessName = businessName;
  if (whatsapp) content.whatsapp = whatsapp;

  const requiresFacebookScope = catalogItems.some((item) => item.imageSource === "facebook");
  const resolvedFacebookPageUrl = toNonEmptyString(content.facebookPageUrl) ?? args.facebookPageUrl;
  if (requiresFacebookScope && !resolvedFacebookPageUrl) {
    throw new Error("web_publish_facebook_page_scope_missing");
  }
  if (resolvedFacebookPageUrl) {
    content.facebookPageUrl = resolvedFacebookPageUrl;
  }

  return {
    action,
    content,
    facebookPageUrl: resolvedFacebookPageUrl
  };
}

async function postJsonWithTimeout(args: {
  fetchFn: FetchLike;
  url: string;
  body: unknown;
  timeoutMs: number;
  apiKeyHeader: string;
  apiKey: string;
}) {
  const bodyObject =
    args.body && isObjectRecord(args.body) ? ({ ...args.body, api_key: args.apiKey } as Record<string, unknown>) : args.body;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), args.timeoutMs);

  try {
    return await args.fetchFn(args.url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        [args.apiKeyHeader]: args.apiKey
      },
      body: JSON.stringify(bodyObject),
      signal: controller.signal
    });
  } finally {
    clearTimeout(timer);
  }
}

async function readResponseBody(response: Awaited<ReturnType<FetchLike>>): Promise<{ json?: unknown; text?: string }> {
  if (response.text) {
    const text = await response.text();
    if (!text) return {};
    try {
      return { json: JSON.parse(text), text };
    } catch {
      return { text };
    }
  }

  if (response.json) {
    try {
      return { json: await response.json() };
    } catch {
      return {};
    }
  }

  return {};
}

function toWebhookPayload(args: {
  operation_id: string;
  action: WebAction;
  content?: WebContentProfile;
  facebookPageUrl?: string;
}): WebPublishWebhookPayload {
  return {
    operation_id: args.operation_id,
    intent: "web",
    action: args.action,
    web: {
      action: args.action,
      content: args.content,
      facebook_page_url: args.facebookPageUrl
    },
    content: args.content,
    timestamp: new Date().toISOString()
  };
}

function extractDeployMetadata(jsonObj?: Record<string, unknown>): { deploy_id?: string; deploy_url?: string } {
  if (!jsonObj) return {};

  const deployId =
    toNonEmptyString(jsonObj.deploy_id) ??
    (isObjectRecord(jsonObj.deploy) ? toNonEmptyString(jsonObj.deploy.id) : undefined) ??
    (isObjectRecord(jsonObj.result) ? toNonEmptyString(jsonObj.result.deploy_id) : undefined);

  const deployUrl =
    toNonEmptyString(jsonObj.deploy_url) ??
    (isObjectRecord(jsonObj.deploy) ? toNonEmptyString(jsonObj.deploy.url) : undefined) ??
    (isObjectRecord(jsonObj.result) ? toNonEmptyString(jsonObj.result.deploy_url) : undefined);

  return {
    deploy_id: deployId,
    deploy_url: deployUrl
  };
}

export function createPublishSiteTool(config: PublishSiteToolConfig = {}) {
  const fetchFn = config.fetchFn ?? ((globalThis.fetch as unknown) as FetchLike | undefined);
  const webhookUrl = config.webhookUrl?.trim() || undefined;
  const apiKey = config.apiKey?.trim() || undefined;
  const apiKeyHeader = config.apiKeyHeader?.trim() || "x-api-key";
  const timeoutMs = Number.isFinite(config.timeoutMs) && (config.timeoutMs ?? 0) > 0 ? Math.trunc(config.timeoutMs!) : 5000;
  const maxRetries = Number.isFinite(config.maxRetries) && (config.maxRetries ?? -1) >= 0 ? Math.trunc(config.maxRetries!) : 2;
  const dryRunDefault = config.dryRunDefault ?? true;
  const retryBackoffMs = Number.isFinite(config.retryBackoffMs) && (config.retryBackoffMs ?? -1) >= 0
    ? Math.trunc(config.retryBackoffMs!)
    : 150;
  const allowedImageDomains = normalizeDomains(config.allowedImageDomains ?? ["facebook.com", "fbcdn.net"]);
  const facebookPageUrl = config.facebookPageUrl?.trim() || undefined;

  return async function publishSiteTool(args: {
    operation_id: string;
    payload: WebPublishPayload;
    dryRun?: boolean;
  }): Promise<ToolExecutionResult<WebPublishPayload & { deploy_id?: string; deploy_url?: string }>> {
    const dry_run = args.dryRun ?? dryRunDefault;
    const normalized = validateAndNormalizePayload({
      payload: args.payload,
      allowedImageDomains,
      facebookPageUrl
    });
    const payload: WebPublishPayload = {
      action: normalized.action,
      content: normalized.content
    };

    if (dry_run) {
      return {
        ok: true,
        dry_run,
        operation_id: args.operation_id,
        payload,
        detail: "web-publish dry-run"
      };
    }

    if (!fetchFn) {
      throw new Error("web_publish_fetch_unavailable");
    }
    if (!webhookUrl) {
      throw new Error("web_publish_webhook_url_missing");
    }
    if (!apiKey) {
      throw new Error("web_publish_api_key_missing");
    }

    const attempts = maxRetries + 1;
    const webhookPayload = toWebhookPayload({
      operation_id: args.operation_id,
      action: normalized.action,
      content: normalized.content,
      facebookPageUrl: normalized.facebookPageUrl
    });
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      try {
        const response = await postJsonWithTimeout({
          fetchFn,
          url: webhookUrl,
          body: webhookPayload,
          timeoutMs,
          apiKey,
          apiKeyHeader
        });

        if (response.ok) {
          const responseBody = await readResponseBody(response);
          const jsonObj =
            responseBody.json && isObjectRecord(responseBody.json)
              ? (responseBody.json as Record<string, unknown>)
              : undefined;

          if (jsonObj && jsonObj.ok === false) {
            throw new Error(`web_publish_remote_${sanitizeErrorToken(jsonObj.error)}`);
          }

          if (!jsonObj && responseBody.text && isHtmlText(responseBody.text)) {
            throw new Error("web_publish_response_invalid");
          }

          const deployMeta = extractDeployMetadata(jsonObj);
          return {
            ok: true,
            dry_run,
            operation_id: args.operation_id,
            payload: {
              ...payload,
              ...deployMeta
            },
            detail: `web-publish executed (attempt=${attempt})`
          };
        }

        if (isRetriableHttpStatus(response.status) && attempt < attempts) {
          await sleep(retryBackoffMs * attempt);
          continue;
        }
        const responseBody = await readResponseBody(response);
        const jsonObj =
          responseBody.json && isObjectRecord(responseBody.json)
            ? (responseBody.json as Record<string, unknown>)
            : undefined;
        const remoteErrorToken = sanitizeErrorToken(
          jsonObj?.error ?? jsonObj?.message ?? jsonObj?.detail ?? responseBody.text
        );
        if (remoteErrorToken !== "unknown") {
          throw new Error(`web_publish_http_${response.status}_${remoteErrorToken}`);
        }
        throw new Error(`web_publish_http_${response.status}`);
      } catch (err) {
        const cls = classifyTransportError(err);
        if ((cls === "timeout" || cls === "network") && attempt < attempts) {
          await sleep(retryBackoffMs * attempt);
          continue;
        }
        lastError = err instanceof Error ? err : new Error(String(err));
        break;
      }
    }

    throw lastError ?? new Error("web_publish_failed");
  };
}

export const publishSiteTool = createPublishSiteTool();

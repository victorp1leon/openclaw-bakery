import fs from "node:fs";
import path from "node:path";

import dotenv from "dotenv";

import { loadAppConfig } from "../../src/config/appConfig";

dotenv.config({
  path: [path.resolve(process.cwd(), ".env"), path.resolve(__dirname, "../../.env")]
});

type ContentRecord = Record<string, unknown> & {
  facebookPageUrl?: string;
  gallery?: string[];
  catalogItems?: Array<Record<string, unknown>>;
};

function toPositiveInt(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const n = Number.parseInt(value, 10);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return n;
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeDomains(domains: string[]): string[] {
  const unique = new Set<string>();
  for (const raw of domains) {
    const normalized = raw.trim().toLowerCase().replace(/^\.+/, "");
    if (normalized.length > 0) unique.add(normalized);
  }
  return [...unique];
}

function isAllowedHost(hostname: string, allowedDomains: string[]): boolean {
  const host = hostname.trim().toLowerCase();
  return allowedDomains.some((domain) => host === domain || host.endsWith(`.${domain}`));
}

function sanitizeMediaUrl(raw: string, allowedDomains: string[]): string | undefined {
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:") return undefined;
    if (!isAllowedHost(url.hostname, allowedDomains)) return undefined;
    url.search = "";
    url.hash = "";
    return url.toString();
  } catch {
    return undefined;
  }
}

function decodeCandidate(raw: string): string {
  return raw
    .replace(/\\u0025/gi, "%")
    .replace(/\\u0026/gi, "&")
    .replace(/\\u002f/gi, "/")
    .replace(/\\u003d/gi, "=")
    .replace(/\\u002d/gi, "-")
    .replace(/\\\//g, "/")
    .replace(/&amp;/g, "&");
}

function extractImageCandidates(html: string): string[] {
  const collected: string[] = [];
  const directRegex = /https:\/\/[^"'<>\\\s]+/g;
  const escapedRegex = /https:\\\/\\\/[^"'<>\\\s]+/g;

  const directMatches = html.match(directRegex) ?? [];
  const escapedMatches = html.match(escapedRegex) ?? [];

  collected.push(...directMatches, ...escapedMatches);
  return collected.map(decodeCandidate);
}

function looksLikeFbImage(url: string): boolean {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    if (!host.includes("scontent.")) {
      return false;
    }

    const pathLower = parsed.pathname.toLowerCase();
    const imageExt = [".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp", ".avif", ".heic"];
    return imageExt.some((ext) => pathLower.endsWith(ext));
  } catch {
    return false;
  }
}

function requireFacebookPageUrl(raw: string): string {
  const pageUrl = raw.trim();
  if (!pageUrl) throw new Error("facebook_page_url_missing");
  let parsed: URL;
  try {
    parsed = new URL(pageUrl);
  } catch {
    throw new Error("facebook_page_url_invalid");
  }
  if (parsed.protocol !== "https:") throw new Error("facebook_page_url_invalid");
  const host = parsed.hostname.toLowerCase();
  const allowedHosts = ["facebook.com", "www.facebook.com", "m.facebook.com"];
  if (!allowedHosts.includes(host)) throw new Error("facebook_page_url_out_of_scope");
  return parsed.toString();
}

function toContentRecord(value: unknown): ContentRecord {
  if (!isObjectRecord(value)) throw new Error("web_content_invalid");
  return { ...value } as ContentRecord;
}

function toArrayOfStrings(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string" && v.trim().length > 0).map((v) => v.trim());
}

async function main() {
  const config = loadAppConfig();
  const repoRoot = path.resolve(__dirname, "../..");
  const contentPath = process.env.WEB_CONTENT_PATH?.trim() || config.webTool.contentPath;
  const sourceFile = path.isAbsolute(contentPath) ? contentPath : path.resolve(repoRoot, contentPath);

  if (!fs.existsSync(sourceFile)) {
    throw new Error(`web_content_file_missing:${sourceFile}`);
  }

  const raw = fs.readFileSync(sourceFile, "utf8");
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("web_content_json_invalid");
  }

  const content = toContentRecord(parsed);
  const pageUrl = requireFacebookPageUrl(
    process.env.WEB_FB_PAGE_URL?.trim() ||
      process.env.WEB_FACEBOOK_PAGE_URL?.trim() ||
      (typeof content.facebookPageUrl === "string" ? content.facebookPageUrl : "")
  );

  const importLimit = Math.min(toPositiveInt(process.env.WEB_FB_IMPORT_LIMIT, 12), 50);
  const applyToCatalog = process.env.WEB_FB_IMPORT_APPLY_TO_CATALOG === "1";
  const dryRun = process.env.WEB_FB_IMPORT_DRY_RUN === "1";
  const allowedDomains = normalizeDomains(config.webTool.publish.allowedImageDomains);

  if (allowedDomains.length === 0) {
    throw new Error("web_publish_allowed_image_domains_missing");
  }

  const response = await fetch(pageUrl, {
    method: "GET",
    headers: {
      "user-agent": "Mozilla/5.0 (compatible; OpenClawBakeryBot/1.0; +https://example.local)",
      accept: "text/html,application/xhtml+xml"
    }
  });

  if (!response.ok) {
    throw new Error(`facebook_fetch_http_${response.status}`);
  }

  const html = await response.text();
  const rawCandidates = extractImageCandidates(html);
  const imageCandidates = rawCandidates.filter(looksLikeFbImage);

  const unique = new Set<string>();
  const imported: string[] = [];
  for (const candidate of imageCandidates) {
    const sanitized = sanitizeMediaUrl(candidate, allowedDomains);
    if (!sanitized || unique.has(sanitized)) continue;
    unique.add(sanitized);
    imported.push(sanitized);
    if (imported.length >= importLimit) break;
  }

  if (imported.length === 0) {
    if (imageCandidates.length > 0) {
      throw new Error("facebook_media_filtered_by_domain_policy");
    }
    throw new Error("facebook_media_not_found");
  }

  const previousGallery = toArrayOfStrings(content.gallery);
  const mergedGallery = [...new Set([...imported, ...previousGallery])];
  content.gallery = mergedGallery;
  content.facebookPageUrl = pageUrl;

  let catalogUpdated = 0;
  if (applyToCatalog && Array.isArray(content.catalogItems) && content.catalogItems.length > 0) {
    let idx = 0;
    for (const item of content.catalogItems) {
      if (!isObjectRecord(item)) continue;
      const imageSource = typeof item.imageSource === "string" ? item.imageSource.trim().toLowerCase() : "";
      const needsFacebookImage = imageSource === "facebook" || typeof item.imageUrl !== "string" || item.imageUrl.trim().length === 0;
      if (!needsFacebookImage) continue;
      item.imageUrl = imported[idx % imported.length];
      item.imageSource = "facebook";
      catalogUpdated += 1;
      idx += 1;
    }
  }

  if (!dryRun) {
    fs.writeFileSync(sourceFile, `${JSON.stringify(content, null, 2)}\n`, "utf8");
  }

  console.log(
    JSON.stringify(
      {
        event: "facebook_images_import_result",
        dryRun,
        sourceFile,
        pageUrl,
        importLimit,
        rawCandidatesCount: rawCandidates.length,
        imageCandidatesCount: imageCandidates.length,
        importedCount: imported.length,
        galleryBefore: previousGallery.length,
        galleryAfter: mergedGallery.length,
        catalogUpdated,
        importedPreview: imported.slice(0, 5)
      },
      null,
      2
    )
  );
}

void main().catch((err: unknown) => {
  const detail = err instanceof Error ? err.message : String(err);
  console.error(JSON.stringify({ event: "facebook_images_import_failed", detail }, null, 2));
  process.exitCode = 1;
});

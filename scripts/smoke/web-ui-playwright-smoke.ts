import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { chromium } from "playwright-core";

type CheckResult = {
  name: string;
  ok: boolean;
  detail?: string;
};

type ViewportResult = {
  viewport: string;
  checks: CheckResult[];
};

type SmokeResult = {
  checks: CheckResult[];
  viewports: ViewportResult[];
};

const DIST_DIR = path.resolve(process.cwd(), "site/dist");
const HEADLESS = process.env.WEB_UI_SMOKE_HEADLESS !== "0";
const SCREENSHOTS = process.env.WEB_UI_SMOKE_SCREENSHOTS === "1";
const SKIP_BROWSER = process.env.WEB_UI_SMOKE_SKIP_BROWSER === "1";
const CHROMIUM_EXECUTABLE_PATH = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;

function safeWrite(message: string): void {
  process.stdout.write(`${message}\n`);
}

function toCheck(name: string, ok: boolean, detail?: string): CheckResult {
  return { name, ok, detail };
}

function ensureDistExists(): string {
  if (!fs.existsSync(DIST_DIR)) {
    throw new Error(`web_ui_smoke_dist_missing:${DIST_DIR}`);
  }

  const indexPath = path.join(DIST_DIR, "index.html");
  if (!fs.existsSync(indexPath)) {
    throw new Error(`web_ui_smoke_index_missing:${indexPath}`);
  }

  return indexPath;
}

async function runViewportChecks(
  page: import("playwright-core").Page,
  pageUrl: string,
  viewportLabel: string,
  viewportSize: { width: number; height: number },
  screenshotName?: string
): Promise<ViewportResult> {
  await page.setViewportSize(viewportSize);
  await page.goto(pageUrl, { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".hero-cta .btn-primary");
  await page.waitForSelector(".wa-sticky");

  if (SCREENSHOTS && screenshotName) {
    const outputDir = path.join(DIST_DIR, ".smoke");
    fs.mkdirSync(outputDir, { recursive: true });
    await page.screenshot({ path: path.join(outputDir, screenshotName), fullPage: true });
  }

  const checks: CheckResult[] = [];

  const heroWaHref = await page.locator(".hero-cta .btn-primary").first().getAttribute("href");
  checks.push(
    toCheck(
      "hero_cta_uses_whatsapp",
      typeof heroWaHref === "string" && heroWaHref.startsWith("https://wa.me/"),
      heroWaHref ?? "missing_href"
    )
  );

  const stickyVisible = await page.locator(".wa-sticky").isVisible();
  checks.push(toCheck("sticky_whatsapp_visible", stickyVisible));

  const customHref = await page.locator("#personalizados .btn-primary").first().getAttribute("href");
  const customMessage =
    typeof customHref === "string" ? decodeURIComponent((customHref.split("?text=")[1] ?? "").replace(/\+/g, "%20")) : "";
  checks.push(
    toCheck(
      "custom_order_link_prefilled",
      typeof customHref === "string" &&
        customHref.includes("wa.me/") &&
        customMessage.toLowerCase().includes("pastel personalizado"),
      customHref ?? "missing_href"
    )
  );

  const orderButtonCount = await page.locator("#catalogo .btn-card").count();
  checks.push(toCheck("catalog_has_order_buttons", orderButtonCount > 0, String(orderButtonCount)));

  const invalidOrderButtons = await page.locator("#catalogo .btn-card").evaluateAll((nodes) => {
    return nodes.filter((node) => {
      const href = node.getAttribute("href") ?? "";
      return !href.includes("wa.me/") || !href.includes("?text=");
    }).length;
  });
  checks.push(toCheck("catalog_buttons_include_prefilled_whatsapp_text", invalidOrderButtons === 0, String(invalidOrderButtons)));

  const categoryTabsCount = await page.locator(".category-tabs .tab-chip").count();
  checks.push(toCheck("catalog_category_tabs_present", categoryTabsCount >= 1, String(categoryTabsCount)));

  const mapSrc = await page.locator("#contacto iframe").first().getAttribute("src");
  checks.push(
    toCheck(
      "contact_map_embed_present",
      typeof mapSrc === "string" && mapSrc.startsWith("https://"),
      mapSrc ?? "missing_src"
    )
  );

  if (viewportLabel === "mobile") {
    const overflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth - window.innerWidth;
    });
    checks.push(toCheck("mobile_no_horizontal_overflow", overflow <= 1, String(overflow)));
  }

  return { viewport: viewportLabel, checks };
}

function printResults(result: SmokeResult): void {
  for (const check of result.checks) {
    safeWrite(`${check.ok ? "PASS" : "FAIL"} [global] ${check.name}${check.detail ? ` -> ${check.detail}` : ""}`);
  }

  for (const viewportResult of result.viewports) {
    for (const check of viewportResult.checks) {
      safeWrite(
        `${check.ok ? "PASS" : "FAIL"} [${viewportResult.viewport}] ${check.name}${check.detail ? ` -> ${check.detail}` : ""}`
      );
    }
  }
}

function hasFailures(result: SmokeResult): boolean {
  const globalFail = result.checks.some((check) => !check.ok);
  const viewportFail = result.viewports.some((viewport) => viewport.checks.some((check) => !check.ok));
  return globalFail || viewportFail;
}

async function main(): Promise<void> {
  let indexPath: string;
  try {
    indexPath = ensureDistExists();
  } catch (error) {
    safeWrite(String(error));
    process.exit(1);
    return;
  }

  if (SKIP_BROWSER) {
    safeWrite("web_ui_smoke_skip_browser=1; dist files are present and ready for browser validation.");
    return;
  }

  const smokeResult: SmokeResult = {
    checks: [toCheck("dist_index_exists", true, indexPath)],
    viewports: []
  };

  let browser: import("playwright-core").Browser | null = null;
  try {
    try {
      browser = await chromium.launch({
        headless: HEADLESS,
        ...(CHROMIUM_EXECUTABLE_PATH ? { executablePath: CHROMIUM_EXECUTABLE_PATH } : {})
      });
    } catch (error) {
      smokeResult.checks.push(
        toCheck(
          "playwright_browser_launch",
          false,
          "Browser launch failed. Set PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH or install with `PLAYWRIGHT_BROWSERS_PATH=.playwright-browsers node node_modules/playwright-core/cli.js install chromium`."
        )
      );
      smokeResult.checks.push(toCheck("playwright_launch_error_detail", false, String(error)));
      printResults(smokeResult);
      process.exit(1);
      return;
    }

    try {
      const page = await browser.newPage();
      const pageUrl = pathToFileURL(indexPath).toString();
      smokeResult.viewports.push(
        await runViewportChecks(page, pageUrl, "desktop", { width: 1366, height: 900 }, "desktop.png")
      );
      smokeResult.viewports.push(
        await runViewportChecks(page, pageUrl, "mobile", { width: 390, height: 844 }, "mobile.png")
      );
    } catch (error) {
      smokeResult.checks.push(toCheck("playwright_validation_runtime", false, String(error)));
    } finally {
      await browser.close();
      browser = null;
    }
  } finally {
    if (browser) {
      await browser.close().catch(() => undefined);
    }
  }

  printResults(smokeResult);

  if (hasFailures(smokeResult)) {
    process.exit(1);
  }
}

main().catch((error) => {
  safeWrite(`web_ui_smoke_unhandled_error:${String(error)}`);
  process.exit(1);
});

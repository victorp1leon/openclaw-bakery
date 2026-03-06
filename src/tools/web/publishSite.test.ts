import { describe, expect, it, vi } from "vitest";

import { createPublishSiteTool } from "./publishSite";

describe("publishSiteTool", () => {
  it("returns dry-run by default", async () => {
    const tool = createPublishSiteTool();

    const result = await tool({
      operation_id: "op-1",
      payload: {
        action: "crear",
        content: {
          businessName: "Hadi Bakery",
          whatsapp: "+5215512345678"
        }
      }
    });

    expect(result.ok).toBe(true);
    expect(result.dry_run).toBe(true);
    expect(result.detail).toContain("dry-run");
  });

  it("fails when dry-run is disabled and webhook url is missing", async () => {
    const fetchFn = vi.fn();
    const tool = createPublishSiteTool({
      fetchFn,
      apiKey: "secret",
      dryRunDefault: false
    });

    await expect(
      tool({
        operation_id: "op-2",
        payload: {
          action: "crear",
          content: {
            businessName: "Hadi Bakery",
            whatsapp: "+5215512345678"
          }
        }
      })
    ).rejects.toThrow("web_publish_webhook_url_missing");

    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("fails when dry-run is disabled and api key is missing", async () => {
    const fetchFn = vi.fn();
    const tool = createPublishSiteTool({
      fetchFn,
      webhookUrl: "https://example.com/webhook",
      dryRunDefault: false
    });

    await expect(
      tool({
        operation_id: "op-3",
        payload: {
          action: "crear",
          content: {
            businessName: "Hadi Bakery",
            whatsapp: "+5215512345678"
          }
        }
      })
    ).rejects.toThrow("web_publish_api_key_missing");

    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("rejects unsupported action values", async () => {
    const tool = createPublishSiteTool();

    await expect(
      tool({
        operation_id: "op-4",
        payload: {
          action: "eliminar" as "crear",
          content: {
            businessName: "Hadi Bakery",
            whatsapp: "+5215512345678"
          }
        }
      })
    ).rejects.toThrow("web_publish_action_invalid");
  });

  it("fails when menu action has no menuItems or catalogItems", async () => {
    const tool = createPublishSiteTool();

    await expect(
      tool({
        operation_id: "op-5",
        payload: {
          action: "menu",
          content: {
            businessName: "Hadi Bakery",
            whatsapp: "+5215512345678"
          }
        }
      })
    ).rejects.toThrow("web_publish_menu_content_missing");
  });

  it("rejects non-https catalog image URLs", async () => {
    const tool = createPublishSiteTool({
      allowedImageDomains: ["example.com"]
    });

    await expect(
      tool({
        operation_id: "op-6",
        payload: {
          action: "menu",
          content: {
            catalogItems: [
              {
                id: "item-1",
                nombre: "Cupcake",
                precio: 50,
                imageUrl: "http://example.com/image.jpg",
                imageSource: "manual"
              }
            ]
          }
        }
      })
    ).rejects.toThrow("web_publish_image_url_invalid");
  });

  it("rejects catalog image URLs outside allowed domains", async () => {
    const tool = createPublishSiteTool({
      allowedImageDomains: ["images.hadibakery.com"]
    });

    await expect(
      tool({
        operation_id: "op-7",
        payload: {
          action: "menu",
          content: {
            catalogItems: [
              {
                id: "item-1",
                nombre: "Cupcake",
                precio: 50,
                imageUrl: "https://evil.example.com/image.jpg",
                imageSource: "manual"
              }
            ]
          }
        }
      })
    ).rejects.toThrow("web_publish_image_domain_not_allowed");
  });

  it("fails when facebook source is used without configured page scope", async () => {
    const tool = createPublishSiteTool({
      allowedImageDomains: ["facebook.com", "fbcdn.net"]
    });

    await expect(
      tool({
        operation_id: "op-8",
        payload: {
          action: "menu",
          content: {
            catalogItems: [
              {
                id: "item-1",
                nombre: "Pastel",
                precio: 600,
                imageUrl: "https://scontent.xx.fbcdn.net/v/t1.15752-9/sample.jpg",
                imageSource: "facebook"
              }
            ]
          }
        }
      })
    ).rejects.toThrow("web_publish_facebook_page_scope_missing");
  });

  it("posts mapped payload when live connector is enabled", async () => {
    const fetchFn = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ ok: true, deploy_id: "dep-1", deploy_url: "https://hadi-bakery.netlify.app" })
    });

    const tool = createPublishSiteTool({
      fetchFn,
      webhookUrl: "https://example.com/web/publish",
      apiKey: "top-secret",
      apiKeyHeader: "x-web-key",
      dryRunDefault: false,
      maxRetries: 0,
      allowedImageDomains: ["images.hadibakery.com", "facebook.com", "fbcdn.net"],
      facebookPageUrl: "https://www.facebook.com/hadibakery"
    });

    const result = await tool({
      operation_id: "op-9",
      payload: {
        action: "menu",
        content: {
          businessName: "Hadi Bakery",
          whatsapp: "+5215512345678",
          catalogItems: [
            {
              id: "cupcake-red-velvet",
              nombre: "Cupcake Red Velvet",
              precio: 55,
              imageUrl: "https://images.hadibakery.com/products/red-velvet.jpg?utm_source=fb#section",
              imageSource: "manual"
            }
          ]
        }
      }
    });

    expect(result.ok).toBe(true);
    expect(result.dry_run).toBe(false);
    expect(result.payload.deploy_id).toBe("dep-1");
    expect(result.payload.deploy_url).toBe("https://hadi-bakery.netlify.app");
    expect(fetchFn).toHaveBeenCalledTimes(1);

    const [, init] = fetchFn.mock.calls[0] as [string, RequestInit];
    const headers = init.headers as Record<string, string>;
    const body = JSON.parse(String(init.body)) as Record<string, unknown>;
    const content = body.content as Record<string, unknown>;
    const catalogItems = content.catalogItems as Array<Record<string, unknown>>;

    expect(headers["x-web-key"]).toBe("top-secret");
    expect(body.operation_id).toBe("op-9");
    expect(body.intent).toBe("web");
    expect(body.action).toBe("menu");
    expect(body.api_key).toBe("top-secret");
    expect(catalogItems[0]?.imageUrl).toBe("https://images.hadibakery.com/products/red-velvet.jpg");
  });

  it("retries once on retriable 5xx status", async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 503 })
      .mockResolvedValueOnce({ ok: true, status: 200, text: async () => JSON.stringify({ ok: true }) });

    const tool = createPublishSiteTool({
      fetchFn,
      webhookUrl: "https://example.com/web/publish",
      apiKey: "secret",
      dryRunDefault: false,
      maxRetries: 2,
      retryBackoffMs: 0,
      allowedImageDomains: ["images.hadibakery.com"]
    });

    const result = await tool({
      operation_id: "op-10",
      payload: {
        action: "menu",
        content: {
          catalogItems: [
            {
              id: "item-1",
              nombre: "Concha",
              precio: 20,
              imageUrl: "https://images.hadibakery.com/products/concha.jpg",
              imageSource: "manual"
            }
          ]
        }
      }
    });

    expect(result.ok).toBe(true);
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it("does not retry on non-retriable 4xx status", async () => {
    const fetchFn = vi.fn().mockResolvedValue({ ok: false, status: 400 });

    const tool = createPublishSiteTool({
      fetchFn,
      webhookUrl: "https://example.com/web/publish",
      apiKey: "secret",
      dryRunDefault: false,
      maxRetries: 3,
      retryBackoffMs: 0,
      allowedImageDomains: ["images.hadibakery.com"]
    });

    await expect(
      tool({
        operation_id: "op-11",
        payload: {
          action: "menu",
          content: {
            catalogItems: [
              {
                id: "item-1",
                nombre: "Concha",
                precio: 20,
                imageUrl: "https://images.hadibakery.com/products/concha.jpg",
                imageSource: "manual"
              }
            ]
          }
        }
      })
    ).rejects.toThrow("web_publish_http_400");

    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it("surfaces upstream error token for non-ok responses", async () => {
    const fetchFn = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => JSON.stringify({ ok: false, error: "local_publish_failed" })
    });

    const tool = createPublishSiteTool({
      fetchFn,
      webhookUrl: "https://example.com/web/publish",
      apiKey: "secret",
      dryRunDefault: false,
      maxRetries: 0,
      allowedImageDomains: ["images.hadibakery.com"]
    });

    await expect(
      tool({
        operation_id: "op-12b",
        payload: {
          action: "menu",
          content: {
            catalogItems: [
              {
                id: "item-1",
                nombre: "Concha",
                precio: 20,
                imageUrl: "https://images.hadibakery.com/products/concha.jpg",
                imageSource: "manual"
              }
            ]
          }
        }
      })
    ).rejects.toThrow("web_publish_http_500_local_publish_failed");
  });

  it("fails when upstream returns ok=false in JSON body with 200 status", async () => {
    const fetchFn = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ ok: false, error: "publish_unauthorized" })
    });

    const tool = createPublishSiteTool({
      fetchFn,
      webhookUrl: "https://example.com/web/publish",
      apiKey: "secret",
      dryRunDefault: false,
      maxRetries: 0,
      allowedImageDomains: ["images.hadibakery.com"]
    });

    await expect(
      tool({
        operation_id: "op-12",
        payload: {
          action: "menu",
          content: {
            catalogItems: [
              {
                id: "item-1",
                nombre: "Concha",
                precio: 20,
                imageUrl: "https://images.hadibakery.com/products/concha.jpg",
                imageSource: "manual"
              }
            ]
          }
        }
      })
    ).rejects.toThrow("web_publish_remote_publish_unauthorized");
  });

  it("fails when upstream returns HTML with 200 status", async () => {
    const fetchFn = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => "<!DOCTYPE html><html><body>Error</body></html>"
    });

    const tool = createPublishSiteTool({
      fetchFn,
      webhookUrl: "https://example.com/web/publish",
      apiKey: "secret",
      dryRunDefault: false,
      maxRetries: 0,
      allowedImageDomains: ["images.hadibakery.com"]
    });

    await expect(
      tool({
        operation_id: "op-13",
        payload: {
          action: "menu",
          content: {
            catalogItems: [
              {
                id: "item-1",
                nombre: "Concha",
                precio: 20,
                imageUrl: "https://images.hadibakery.com/products/concha.jpg",
                imageSource: "manual"
              }
            ]
          }
        }
      })
    ).rejects.toThrow("web_publish_response_invalid");
  });
});

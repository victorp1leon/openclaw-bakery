import { describe, expect, it } from "vitest";

import { routeIntent, routeIntentDetailed } from "./intentRouter";

describe("routeIntent fallback heuristics", () => {
  it("detecta gasto aunque no inicie con la palabra gasto", async () => {
    const runtime = {
      completeJson: async () => {
        throw new Error("openclaw_down");
      }
    };

    const intent = await routeIntent("agrega un gasto de harina de 380 pesos", runtime);
    expect(intent).toBe("gasto");
  });

  it("si OpenClaw responde unknown usa heurística local cuando aplica", async () => {
    const runtime = {
      completeJson: async () => ({ intent: "unknown" })
    };

    const intent = await routeIntent("agrega un gasto de harina de 380 pesos", runtime);
    expect(intent).toBe("gasto");
  });

  it("interpreta intent cuando viene dentro de payloads[].text del sobre OpenClaw", async () => {
    const runtime = {
      completeJson: async () => ({
        payloads: [{ text: "{\"intent\":\"gasto\"}" }]
      })
    };

    const intent = await routeIntent("agrega un gasto de harina de 380 pesos", runtime);
    expect(intent).toBe("gasto");
  });
});

describe("routeIntent strict mode", () => {
  it("en modo estricto no cae a heurística cuando OpenClaw falla", async () => {
    const prev = process.env.OPENCLAW_STRICT;
    process.env.OPENCLAW_STRICT = "1";

    try {
      const runtime = {
        completeJson: async () => {
          throw new Error("openclaw_down");
        }
      };

      const routed = await routeIntentDetailed("agrega un gasto de harina de 380 pesos", runtime);
      expect(routed.intent).toBe("unknown");
      expect(routed.source).toBe("openclaw");
      expect(routed.openclaw_error).toContain("openclaw_down");
    } finally {
      if (prev == null) delete process.env.OPENCLAW_STRICT;
      else process.env.OPENCLAW_STRICT = prev;
    }
  });

  it("en modo estricto conserva unknown si OpenClaw responde unknown", async () => {
    const prev = process.env.OPENCLAW_STRICT;
    process.env.OPENCLAW_STRICT = "1";

    try {
      const runtime = {
        completeJson: async () => ({ intent: "unknown" })
      };

      const intent = await routeIntent("agrega un gasto de harina de 380 pesos", runtime);
      expect(intent).toBe("unknown");
    } finally {
      if (prev == null) delete process.env.OPENCLAW_STRICT;
      else process.env.OPENCLAW_STRICT = prev;
    }
  });

  it("en modo estricto expone payload no-JSON de OpenClaw (ej. rate limit)", async () => {
    const prev = process.env.OPENCLAW_STRICT;
    process.env.OPENCLAW_STRICT = "1";

    try {
      const runtime = {
        completeJson: async () => ({
          payloads: [{ text: "⚠️ API rate limit reached. Please try again later." }]
        })
      };

      const routed = await routeIntentDetailed("agrega un gasto", runtime);
      expect(routed.intent).toBe("unknown");
      expect(routed.openclaw_error).toContain("openclaw_non_json_payload");
      expect(routed.openclaw_error).toContain("rate limit");
    } finally {
      if (prev == null) delete process.env.OPENCLAW_STRICT;
      else process.env.OPENCLAW_STRICT = prev;
    }
  });

  it("en modo estricto con softfail usa heurística ante abortos/transientes", async () => {
    const prevStrict = process.env.OPENCLAW_STRICT;
    const prevSoftfail = process.env.OPENCLAW_STRICT_SOFTFAIL;
    process.env.OPENCLAW_STRICT = "1";
    process.env.OPENCLAW_STRICT_SOFTFAIL = "1";

    try {
      const runtime = {
        completeJson: async () => ({
          payloads: [{ text: "This operation was aborted" }]
        })
      };

      const routed = await routeIntentDetailed("agrega un gasto de harina de 300 pesos", runtime);
      expect(routed.intent).toBe("gasto");
      expect(routed.source).toBe("fallback");
      expect(routed.openclaw_error).toContain("aborted");
    } finally {
      if (prevStrict == null) delete process.env.OPENCLAW_STRICT;
      else process.env.OPENCLAW_STRICT = prevStrict;
      if (prevSoftfail == null) delete process.env.OPENCLAW_STRICT_SOFTFAIL;
      else process.env.OPENCLAW_STRICT_SOFTFAIL = prevSoftfail;
    }
  });
});

import { z } from "zod";

import { isStrictSoftfailEnabled, isTransientOpenClawError } from "../openclaw/failover";
import { createOpenClawJsonRuntime, type OpenClawJsonRuntime } from "../openclaw/runtime";
import { firstOpenClawPayloadText, unwrapOpenClawPayloadJson } from "../openclaw/jsonExtract";

export type Intent = "gasto" | "pedido" | "web" | "ayuda" | "unknown";
export type IntentSource = "openclaw" | "fallback" | "custom";
export type RoutedIntent = {
  intent: Intent;
  source: IntentSource;
  strict_mode: boolean;
  openclaw_error?: string;
};

const IntentSchema = z.object({
  intent: z.enum(["gasto", "pedido", "web", "ayuda", "unknown"])
}).strict();

function heuristicRouteIntent(text: string): Intent {
  const t = text.trim().toLowerCase();
  if (/^(ayuda|help)\b/.test(t)) return "ayuda";
  if (/\b(gasto|egreso|compr[ae]|pag[oa])\b/.test(t)) return "gasto";
  if (/\b(pedido|orden|encargo)\b/.test(t)) return "pedido";
  if (/\b(web|sitio|p[aá]gina|publicar|men[uú])\b/.test(t)) return "web";
  return "unknown";
}

function toIntent(raw: unknown): Intent | null {
  if (typeof raw === "string") {
    return IntentSchema.shape.intent.safeParse(raw).success ? (raw as Intent) : null;
  }

  const parsed = IntentSchema.safeParse(raw);
  return parsed.success ? parsed.data.intent : null;
}

function isStrictMode(): boolean {
  return process.env.OPENCLAW_STRICT === "1";
}

export async function routeIntentDetailed(
  text: string,
  runtime: OpenClawJsonRuntime = createOpenClawJsonRuntime()
): Promise<RoutedIntent> {
  const strict_mode = isStrictMode();
  const heuristic = heuristicRouteIntent(text);

  // Command-like help messages should remain deterministic even in strict mode.
  if (heuristic === "ayuda") {
    return { intent: "ayuda", source: "fallback", strict_mode };
  }

  const prompt = [
    "Clasifica el mensaje del usuario en una intención del bot.",
    "Opciones válidas: gasto, pedido, web, ayuda, unknown.",
    "Responde SOLO JSON válido con esta forma exacta:",
    '{"intent":"gasto|pedido|web|ayuda|unknown"}',
    `Mensaje: ${text}`
  ].join("\n");

  try {
    const raw = await runtime.completeJson(prompt);
    const payloadText = firstOpenClawPayloadText(raw);
    const intent = toIntent(unwrapOpenClawPayloadJson(raw));
    if (intent && intent !== "unknown") return { intent, source: "openclaw", strict_mode };

    if (intent === "unknown" && !strict_mode && heuristic !== "unknown") {
      return { intent: heuristic, source: "fallback", strict_mode };
    }

    if (intent) return { intent, source: "openclaw", strict_mode };

    const openclawError = payloadText ? `openclaw_non_json_payload:${payloadText}` : "openclaw_intent_invalid_json";

    if (strict_mode) {
      if (isStrictSoftfailEnabled() && heuristic !== "unknown" && isTransientOpenClawError(openclawError)) {
        return {
          intent: heuristic,
          source: "fallback",
          strict_mode,
          openclaw_error: openclawError
        };
      }

      return {
        intent: "unknown",
        source: "openclaw",
        strict_mode,
        openclaw_error: openclawError
      };
    }
  } catch (err) {
    const openclawError = err instanceof Error ? err.message : "openclaw_intent_failed";

    if (strict_mode) {
      if (isStrictSoftfailEnabled() && heuristic !== "unknown" && isTransientOpenClawError(openclawError)) {
        return {
          intent: heuristic,
          source: "fallback",
          strict_mode,
          openclaw_error: openclawError
        };
      }

      return {
        intent: "unknown",
        source: "openclaw",
        strict_mode,
        openclaw_error: openclawError
      };
    }
  }

  return { intent: heuristic, source: "fallback", strict_mode };
}

export async function routeIntent(text: string, runtime: OpenClawJsonRuntime = createOpenClawJsonRuntime()): Promise<Intent> {
  const routed = await routeIntentDetailed(text, runtime);
  return routed.intent;
}

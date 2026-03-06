import { ZodError, ZodTypeAny } from "zod";

export type ValidationOutcome =
  | { ok: true; data: any }
  | { ok: false; missing: string[]; message: string };

function zodMissingPaths(err: ZodError): string[] {
  // Mapeamos issues a paths tipo "monto" o "direccion"
  return err.issues.map(i => (i.path?.length ? i.path.join(".") : "unknown"));
}

export function validateWith(schema: ZodTypeAny, payload: any): ValidationOutcome {
  const res = schema.safeParse(payload);
  if (res.success) return { ok: true, data: res.data };

  const missing = zodMissingPaths(res.error);
  return { ok: false, missing, message: res.error.issues[0]?.message ?? "validation_error" };
}

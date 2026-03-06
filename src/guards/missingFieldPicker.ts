export function pickOneMissing(missing: string[], alreadyAsked?: string): string | undefined  {
  if (!missing.length) return undefined;
  // si ya preguntaste uno, pregunta el siguiente (simple)
  const idx = alreadyAsked ? Math.max(0, missing.indexOf(alreadyAsked) + 1) : 0;
  return missing[idx] ?? missing[0];
}

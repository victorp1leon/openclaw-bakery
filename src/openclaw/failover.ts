const TRANSIENT_OPENCLAW_ERROR_MARKERS = [
  "timed out",
  "timeout",
  "aborted",
  "rate limit",
  "fetch failed"
];

export function isStrictSoftfailEnabled(): boolean {
  return process.env.OPENCLAW_STRICT_SOFTFAIL === "1";
}

export function isTransientOpenClawError(detail: string | undefined): boolean {
  if (!detail) return false;
  const text = detail.toLowerCase();
  return TRANSIENT_OPENCLAW_ERROR_MARKERS.some((marker) => text.includes(marker));
}

export const REQUIRED_REDACTION_PATHS = [
  "*.token",
  "*.secret",
  "*.botToken",
  "*.apiKey",
  "headers.authorization"
] as const;

export const DEFAULT_TEXT_PREVIEW_MAX_LENGTH = 120;

export function buildTextPreview(text: string, maxLength = DEFAULT_TEXT_PREVIEW_MAX_LENGTH): string {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }
  return normalized.slice(0, maxLength);
}


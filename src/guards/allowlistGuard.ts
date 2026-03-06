export function parseAllowedChatIds(raw: string | undefined): Set<string> {
  if (!raw) return new Set();
  return new Set(
    raw
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
  );
}

export function isAllowedChat(chat_id: string, allowedChatIds: Set<string>): boolean {
  return allowedChatIds.has(chat_id);
}

function normalizeControlText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const CONFIRM_COMMANDS = new Set(["confirmar", "confirmo", "si", "ok", "dale", "va"]);
const CANCEL_COMMANDS = new Set(["cancelar", "cancela", "no", "detener", "stop"]);

export function isConfirm(text: string) {
  return CONFIRM_COMMANDS.has(normalizeControlText(text));
}
export function isCancel(text: string) {
  return CANCEL_COMMANDS.has(normalizeControlText(text));
}

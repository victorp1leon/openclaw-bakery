export function isConfirm(text: string) {
  return text.trim().toLowerCase() === "confirmar";
}
export function isCancel(text: string) {
  return text.trim().toLowerCase() === "cancelar";
}

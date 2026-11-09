export type ProjectChatCommand =
  | { kind: "set-counter-width"; value: number }
  | { kind: "unsupported"; message: string };

export function parseProjectChatMessage(input: string): ProjectChatCommand {
  const normalized = input.trim().toLowerCase().replace(",", ".");
  const match = normalized.match(/(?:largura|balcao\s+com)\D{0,24}(\d+(?:\.\d+)?)/i);
  if (match) {
    const value = Number(match[1]);
    if (Number.isFinite(value) && value > 0) return { kind: "set-counter-width", value };
  }
  return {
    kind: "unsupported",
    message: "Entendi a conversa, mas preciso de uma largura em milimetros. Exemplo: largura 900 mm.",
  };
}

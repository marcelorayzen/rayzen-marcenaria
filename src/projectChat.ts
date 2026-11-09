export type ProjectChatCommand =
  | { kind: "set-counter-width"; value: number }
  | { kind: "draft-constraint"; label: string; x: number; y: number; dimensionLabel: string; dimensionValue?: number }
  | { kind: "unsupported"; message: string };

export function parseProjectChatMessage(input: string): ProjectChatCommand {
  const normalized = input.trim().toLowerCase().replace(",", ".");
  const match = normalized.match(/(?:largura|balcao\s+com)\D{0,24}(\d+(?:\.\d+)?)/i);
  if (match) {
    const value = Number(match[1]);
    if (Number.isFinite(value) && value > 0) return { kind: "set-counter-width", value };
  }
  const isPlumbing = /esgoto|esgoto|hidraulic|cano|pia/.test(normalized);
  const xMatch = normalized.match(/(\d+(?:\.\d+)?)\s*(metros?|m)\s*(?:do\s*)?(lado\s*esquerdo|esquerda)/i);
  const yMatch = normalized.match(/(\d+(?:\.\d+)?)\s*(centimetros?|cm)\s*(?:do\s*)?(chao|piso)/i);
  if (isPlumbing && xMatch && yMatch) {
    return {
      kind: "draft-constraint",
      label: "Saida de esgoto",
      x: Number(xMatch[1]) * (xMatch[2].startsWith("m") && !xMatch[2].startsWith("cm") ? 1000 : 1),
      y: Number(yMatch[1]) * (yMatch[2].startsWith("c") ? 10 : 1000),
      dimensionLabel: "diametro",
    };
  }
  return {
    kind: "unsupported",
    message: "Entendi a conversa, mas preciso de uma largura em milimetros. Exemplo: largura 900 mm.",
  };
}

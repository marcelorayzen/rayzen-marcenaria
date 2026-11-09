import type { KeyValueStorage } from "./browserProjectStorage";
import type { CuttingGrain } from "./browserCuttingConfiguration";

export interface SupplementalCutPart {
  id: string;
  code: string;
  name: string;
  material: string;
  thickness: number;
  length: number;
  width: number;
  quantity: number;
  edges: string;
  grain: CuttingGrain;
  sourceReference: string;
}

export type SupplementalCutPartsValidation =
  | { ok: true; parts: SupplementalCutPart[] }
  | { ok: false; errors: string[] };

const grains: CuttingGrain[] = ["length", "width", "none", "pending"];
const fieldLabels = {
  code: "o código",
  name: "o nome",
  material: "o material",
  edges: "as bordas ou fita",
  sourceReference: "a origem",
} as const;
const dimensionLabels = {
  thickness: "a espessura",
  length: "o comprimento",
  width: "a largura",
} as const;

function revisionLabel(revision: number): string {
  if (!Number.isSafeInteger(revision) || revision <= 0) throw new Error("Revisão inválida para registrar a origem.");
  return `R${String(revision).padStart(2, "0")}`;
}

export function manualSupplementalSource(revision: number): string {
  return `Entrada manual registrada na revisão ${revisionLabel(revision)}`;
}

export function calculatedSupplementalSource(code: string, revision: number): string {
  if (!code.trim()) throw new Error("Código da peça calculada é obrigatório para registrar a origem.");
  return `Derivada da peça calculada ${code.trim()} na revisão ${revisionLabel(revision)}`;
}

export function validateSupplementalCutParts(value: unknown): SupplementalCutPartsValidation {
  if (!Array.isArray(value)) return { ok: false, errors: ["A lista de peças complementares é inválida."] };
  const errors: string[] = [];
  const ids = new Set<string>();
  for (const [index, candidate] of value.entries()) {
    if (!candidate || typeof candidate !== "object") {
      errors.push(`Peça complementar ${index + 1} inválida.`);
      continue;
    }
    const part = candidate as Record<string, unknown>;
    const id = typeof part.id === "string" ? part.id.trim() : "";
    if (!id || ids.has(id)) errors.push(`Peça complementar ${index + 1} precisa de ID único.`);
    ids.add(id);
    for (const field of ["code", "name", "material", "edges", "sourceReference"] as const) {
      if (typeof part[field] !== "string" || !part[field].trim()) {
        errors.push(`Peça complementar ${index + 1}: informe ${fieldLabels[field]}.`);
      }
    }
    for (const field of ["thickness", "length", "width"] as const) {
      if (typeof part[field] !== "number" || !Number.isFinite(part[field]) || part[field] <= 0) {
        errors.push(`Peça complementar ${index + 1}: ${dimensionLabels[field]} deve ser positiva.`);
      }
    }
    if (typeof part.quantity !== "number" || !Number.isSafeInteger(part.quantity) || part.quantity <= 0) {
      errors.push(`Peça complementar ${index + 1}: quantidade deve ser inteira e positiva.`);
    }
    if (!grains.includes(part.grain as CuttingGrain)) {
      errors.push(`Peça complementar ${index + 1}: veio inválido.`);
    }
  }
  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, parts: JSON.parse(JSON.stringify(value)) as SupplementalCutPart[] };
}

export class BrowserSupplementalCutParts {
  constructor(
    private readonly storage: KeyValueStorage,
    private readonly key: string,
  ) {}

  load(): SupplementalCutPart[] {
    const raw = this.storage.getItem(this.key);
    if (!raw) return [];
    try {
      const result = validateSupplementalCutParts(JSON.parse(raw) as unknown);
      return result.ok ? result.parts : [];
    } catch {
      return [];
    }
  }

  save(parts: SupplementalCutPart[]): SupplementalCutPart[] {
    const result = validateSupplementalCutParts(parts);
    if (!result.ok) throw new Error(result.errors.join(" "));
    this.storage.setItem(this.key, JSON.stringify(result.parts));
    return result.parts;
  }
}

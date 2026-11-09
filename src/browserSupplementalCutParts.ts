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
        errors.push(`Peça complementar ${index + 1}: informe ${field}.`);
      }
    }
    for (const field of ["thickness", "length", "width"] as const) {
      if (typeof part[field] !== "number" || !Number.isFinite(part[field]) || part[field] <= 0) {
        errors.push(`Peça complementar ${index + 1}: ${field} deve ser positivo.`);
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

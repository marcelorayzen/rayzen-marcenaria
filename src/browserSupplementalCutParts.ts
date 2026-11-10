import type { KeyValueStorage } from "./browserProjectStorage";
import type { CuttingGrain } from "./browserCuttingConfiguration";
import type { CutPartProductionOperation } from "./cuttingPlan";
import { createCompositeDoor15x6 } from "./compositeDoor15x6";
import { createCompositeThickening15x15 } from "./compositeThickening15x15";
import type { PanelEdge } from "./compositePanel";

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
  composite?: {
    id: string;
    kind: "door-15-6" | "thickening-15-15";
    layer: "front-15" | "back-6" | "base-15" | "reinforcement-15";
    bandedSides: Array<"top" | "bottom" | "left" | "right">;
  };
  productionOperations?: CutPartProductionOperation[];
}

export type SupplementalCutPartsValidation =
  | { ok: true; parts: SupplementalCutPart[] }
  | { ok: false; errors: string[] };

export interface SupplementalDoor15x6Input {
  compositeId: string;
  frontId: string;
  backId: string;
  revisionId: string;
  sourceReference: string;
  code: string;
  name: string;
  quantity: number;
  lengthMm: number;
  widthMm: number;
  frontMaterialId: string;
  backMaterialId: string;
  grain: CuttingGrain;
  bandedSides: PanelEdge["side"][];
}

export interface SupplementalThickening15x15Input {
  compositeId: string;
  baseId: string;
  reinforcementId: string;
  revisionId: string;
  sourceReference: string;
  code: string;
  name: string;
  quantity: number;
  lengthMm: number;
  widthMm: number;
  baseMaterialId: string;
  reinforcementMaterialId: string;
  grain: CuttingGrain;
  bandedSides: PanelEdge["side"][];
}

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

const sideLabels: Record<PanelEdge["side"], string> = {
  top: "Superior",
  bottom: "Inferior",
  left: "Esquerda",
  right: "Direita",
};

export function createSupplementalDoor15x6(input: SupplementalDoor15x6Input): SupplementalCutPartsValidation {
  if (!input.code.trim() || !input.name.trim()) {
    return { ok: false, errors: ["Informe o código e o nome da porta composta."] };
  }
  if (!input.frontId.trim() || !input.backId.trim() || input.frontId === input.backId) {
    return { ok: false, errors: ["As duas camadas precisam de IDs técnicos distintos."] };
  }
  const result = createCompositeDoor15x6({
    id: input.compositeId,
    revisionId: input.revisionId,
    sourceReference: input.sourceReference,
    quantity: input.quantity,
    lengthMm: input.lengthMm,
    widthMm: input.widthMm,
    frontMaterialId: input.frontMaterialId,
    backMaterialId: input.backMaterialId,
    grain: input.grain,
    bandedSides: input.bandedSides,
  });
  if (!result.ok) return result;
  const edges = input.bandedSides.length > 0
    ? `Fita 22 mm após composição: ${input.bandedSides.map(side => sideLabels[side]).join(", ")}`
    : "Fita da composição ainda não definida";
  const [front, back] = result.panel.layers;
  const sharedOperations: CutPartProductionOperation[] = [
    {
      kind: "bonding",
      status: "specified",
      description: "Colar as camadas de 15 mm e 6 mm com Tekbond chapa na chapa.",
    },
    {
      kind: "edge-banding",
      status: input.bandedSides.length > 0 ? "specified" : "pending",
      description: input.bandedSides.length > 0
        ? `Aplicar fita 22 mm após composição: ${input.bandedSides.map(side => sideLabels[side]).join(", ")}.`
        : "Definir os lados que receberão fita 22 mm após a composição.",
    },
  ];
  const parts: SupplementalCutPart[] = [
    {
      id: input.frontId,
      code: `${input.code.trim()}-15`,
      name: `${input.name.trim()} · frente 15 mm`,
      material: front.materialId,
      thickness: front.thicknessMm,
      length: front.cutLengthMm,
      width: front.cutWidthMm,
      quantity: result.panel.quantity,
      edges,
      grain: front.grain,
      sourceReference: input.sourceReference,
      productionOperations: [
        ...sharedOperations.map(operation => ({ ...operation })),
        {
          kind: "handle-groove",
          status: "pending",
          description: "Cava na camada de 15 mm: geometria e posição ainda não definidas.",
        },
      ],
      composite: { id: input.compositeId, kind: "door-15-6", layer: "front-15", bandedSides: [...input.bandedSides] },
    },
    {
      id: input.backId,
      code: `${input.code.trim()}-6`,
      name: `${input.name.trim()} · costas 6 mm`,
      material: back.materialId,
      thickness: back.thicknessMm,
      length: back.cutLengthMm,
      width: back.cutWidthMm,
      quantity: result.panel.quantity,
      edges,
      grain: back.grain,
      sourceReference: input.sourceReference,
      productionOperations: sharedOperations.map(operation => ({ ...operation })),
      composite: { id: input.compositeId, kind: "door-15-6", layer: "back-6", bandedSides: [...input.bandedSides] },
    },
  ];
  return validateSupplementalCutParts(parts);
}

export function createSupplementalThickening15x15(input: SupplementalThickening15x15Input): SupplementalCutPartsValidation {
  if (!input.code.trim() || !input.name.trim()) return { ok: false, errors: ["Informe o código e o nome do engrossamento."] };
  const result = createCompositeThickening15x15({
    id: input.compositeId,
    revisionId: input.revisionId,
    sourceReference: input.sourceReference,
    quantity: input.quantity,
    lengthMm: input.lengthMm,
    widthMm: input.widthMm,
    baseMaterialId: input.baseMaterialId,
    reinforcementMaterialId: input.reinforcementMaterialId,
    grain: input.grain,
    bandedSides: input.bandedSides,
  });
  if (!result.ok) return result;
  const [base, reinforcement] = result.panel.layers;
  const edges = input.bandedSides.length > 0
    ? `Fita 35 mm após engrossamento: ${input.bandedSides.map(side => sideLabels[side]).join(", ")}`
    : "Fita do engrossamento ainda não definida";
  const operation = {
    kind: "bonding" as const,
    status: "specified" as const,
    description: "Colar as camadas de 15 mm com Tekbond chapa na chapa para formar 30 mm.",
  };
  return validateSupplementalCutParts([
    {
      id: input.baseId, code: `${input.code.trim()}-15A`, name: `${input.name.trim()} · base 15 mm`,
      material: base.materialId, thickness: 15, length: base.cutLengthMm, width: base.cutWidthMm,
      quantity: result.panel.quantity, edges, grain: base.grain, sourceReference: input.sourceReference,
      productionOperations: [operation],
      composite: { id: input.compositeId, kind: "thickening-15-15", layer: "base-15", bandedSides: [...input.bandedSides] },
    },
    {
      id: input.reinforcementId, code: `${input.code.trim()}-15B`, name: `${input.name.trim()} · reforço 15 mm`,
      material: reinforcement.materialId, thickness: 15, length: reinforcement.cutLengthMm, width: reinforcement.cutWidthMm,
      quantity: result.panel.quantity, edges, grain: reinforcement.grain, sourceReference: input.sourceReference,
      productionOperations: [{ ...operation }],
      composite: { id: input.compositeId, kind: "thickening-15-15", layer: "reinforcement-15", bandedSides: [...input.bandedSides] },
    },
  ]);
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
    if (part.composite !== undefined) {
      const composite = part.composite as Record<string, unknown> | null;
      if (!composite
        || typeof composite.id !== "string"
        || !composite.id.trim()
        || !["door-15-6", "thickening-15-15"].includes(String(composite.kind))
        || !["front-15", "back-6", "base-15", "reinforcement-15"].includes(String(composite.layer))
        || !Array.isArray(composite.bandedSides)
        || composite.bandedSides.some(side => !["top", "bottom", "left", "right"].includes(String(side)))
        || new Set(composite.bandedSides).size !== composite.bandedSides.length) {
        errors.push(`Peça complementar ${index + 1}: vínculo de composição inválido.`);
      }
    }
    if (part.productionOperations !== undefined) {
      if (!Array.isArray(part.productionOperations) || part.productionOperations.some(operation => {
        if (!operation || typeof operation !== "object") return true;
        const item = operation as Record<string, unknown>;
        return !["bonding", "handle-groove", "edge-banding"].includes(String(item.kind))
          || !["specified", "pending"].includes(String(item.status))
          || typeof item.description !== "string"
          || !item.description.trim();
      })) errors.push(`Peça complementar ${index + 1}: operação de produção inválida.`);
    }
  }
  const compositeGroups = new Map<string, Array<Record<string, unknown>>>();
  for (const candidate of value) {
    if (!candidate || typeof candidate !== "object") continue;
    const part = candidate as Record<string, unknown>;
    const composite = part.composite as Record<string, unknown> | undefined;
    if (!composite || typeof composite.id !== "string") continue;
    compositeGroups.set(composite.id, [...(compositeGroups.get(composite.id) ?? []), part]);
  }
  for (const [compositeId, group] of compositeGroups) {
    const byLayer = new Map(group.map(part => [
      (part.composite as Record<string, unknown>).layer,
      part,
    ]));
    const first = group[0].composite as Record<string, unknown>;
    const isDoor = first.kind === "door-15-6";
    const front = byLayer.get(isDoor ? "front-15" : "base-15");
    const back = byLayer.get(isDoor ? "back-6" : "reinforcement-15");
    if (group.length !== 2 || !front || !back) {
      errors.push(`Composição ${compositeId}: informe exatamente as duas camadas esperadas.`);
      continue;
    }
    if (front.thickness !== 15 || back.thickness !== (isDoor ? 6 : 15)) {
      errors.push(`Composição ${compositeId}: espessuras incompatíveis com o tipo informado.`);
    }
    if (["length", "width", "quantity", "grain"].some(field => front[field] !== back[field])) {
      errors.push(`Composição ${compositeId}: as duas camadas devem ter medidas, quantidade e veio iguais.`);
    }
    const frontSides = JSON.stringify((front.composite as Record<string, unknown>).bandedSides);
    const backSides = JSON.stringify((back.composite as Record<string, unknown>).bandedSides);
    if (frontSides !== backSides) errors.push(`Composição ${compositeId}: as duas camadas devem compartilhar as bordas da composição.`);
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

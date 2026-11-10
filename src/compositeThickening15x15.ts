import type { CuttingGrain } from "./browserCuttingConfiguration";
import type { CompositePanel, PanelEdge } from "./compositePanel";

export interface CompositeThickening15x15Input {
  id: string;
  revisionId: string;
  sourceReference: string;
  quantity: number;
  lengthMm: number;
  widthMm: number;
  baseMaterialId: string;
  reinforcementMaterialId: string;
  grain: CuttingGrain;
  bandedSides: PanelEdge["side"][];
}

export type CompositeThickening15x15Result =
  | { ok: false; errors: string[] }
  | { ok: true; panel: CompositePanel };

/** Two equal-size 15 mm layers bonded into a nominal 30 mm thickening. */
export function createCompositeThickening15x15(input: CompositeThickening15x15Input): CompositeThickening15x15Result {
  const errors: string[] = [];
  if (![input.id, input.revisionId, input.sourceReference, input.baseMaterialId, input.reinforcementMaterialId]
    .every(value => value.trim())) errors.push("Identifique engrossamento, revisão, origem e materiais das duas camadas.");
  if (!Number.isSafeInteger(input.quantity) || input.quantity <= 0) errors.push("Quantidade do engrossamento deve ser um inteiro positivo.");
  if (![input.lengthMm, input.widthMm].every(value => Number.isFinite(value) && value > 0)) errors.push("Comprimento e largura devem ser positivos e finitos.");
  if (!["length", "width", "none", "pending"].includes(input.grain)) errors.push("Sentido do veio inválido.");
  if (new Set(input.bandedSides).size !== input.bandedSides.length) errors.push("Cada lado com fita deve aparecer uma única vez.");
  if (errors.length > 0) return { ok: false, errors };
  return {
    ok: true,
    panel: {
      id: input.id,
      revisionId: input.revisionId,
      sourceReference: input.sourceReference,
      quantity: input.quantity,
      layers: [
        { id: "base-15", materialId: input.baseMaterialId, thicknessMm: 15, cutLengthMm: input.lengthMm, cutWidthMm: input.widthMm, grain: input.grain },
        { id: "reinforcement-15", materialId: input.reinforcementMaterialId, thicknessMm: 15, cutLengthMm: input.lengthMm, cutWidthMm: input.widthMm, grain: input.grain },
      ],
      edges: input.bandedSides.map(side => ({ side, bandWidthMm: 35, bandThicknessMm: null })),
      operations: [{ id: "bond-15-15", kind: "bonding", layerIds: ["base-15", "reinforcement-15"], specificationReference: "Tekbond chapa na chapa" }],
    },
  };
}

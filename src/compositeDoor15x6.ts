import type { CuttingGrain } from "./browserCuttingConfiguration";
import type { CompositePanel, PanelEdge } from "./compositePanel";

export interface CompositeDoor15x6Input {
  id: string;
  revisionId: string;
  sourceReference: string;
  quantity: number;
  lengthMm: number;
  widthMm: number;
  frontMaterialId: string;
  backMaterialId: string;
  grain: CuttingGrain;
  bandedSides: PanelEdge["side"][];
}

export type CompositeDoor15x6Result =
  | { ok: false; errors: string[] }
  | { ok: true; panel: CompositePanel };

/**
 * Confirmed workshop construction: equal-size 15 mm and 6 mm layers form a
 * nominal 21 mm door. The 22 mm band is recorded only on explicitly selected
 * sides. Groove geometry remains pending and never changes cutting dimensions.
 */
export function createCompositeDoor15x6(input: CompositeDoor15x6Input): CompositeDoor15x6Result {
  const errors: string[] = [];
  if (![input.id, input.revisionId, input.sourceReference, input.frontMaterialId, input.backMaterialId]
    .every(value => value.trim())) errors.push("Identifique porta, revisão, origem e materiais das duas camadas.");
  if (!Number.isSafeInteger(input.quantity) || input.quantity <= 0) {
    errors.push("Quantidade da porta deve ser um inteiro positivo.");
  }
  if (![input.lengthMm, input.widthMm].every(value => Number.isFinite(value) && value > 0)) {
    errors.push("Comprimento e largura da porta devem ser positivos e finitos.");
  }
  if (!["length", "width", "none", "pending"].includes(input.grain)) errors.push("Sentido do veio inválido.");
  if (new Set(input.bandedSides).size !== input.bandedSides.length) {
    errors.push("Cada lado com fita deve aparecer uma única vez.");
  }
  if (errors.length > 0) return { ok: false, errors };

  return {
    ok: true,
    panel: {
      id: input.id,
      revisionId: input.revisionId,
      sourceReference: input.sourceReference,
      quantity: input.quantity,
      layers: [
        {
          id: "front-15",
          materialId: input.frontMaterialId,
          thicknessMm: 15,
          cutLengthMm: input.lengthMm,
          cutWidthMm: input.widthMm,
          grain: input.grain,
        },
        {
          id: "back-6",
          materialId: input.backMaterialId,
          thicknessMm: 6,
          cutLengthMm: input.lengthMm,
          cutWidthMm: input.widthMm,
          grain: input.grain,
        },
      ],
      edges: input.bandedSides.map(side => ({
        side,
        bandWidthMm: 22,
        bandThicknessMm: null,
      })),
      operations: [
        {
          id: "bond-15-6",
          kind: "bonding",
          layerIds: ["front-15", "back-6"],
          specificationReference: "Tekbond chapa na chapa",
        },
        {
          id: "handle-groove-15",
          kind: "handle-groove",
          layerIds: ["front-15"],
          specificationReference: null,
        },
      ],
    },
  };
}

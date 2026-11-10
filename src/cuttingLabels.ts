import type { PreliminaryCutPlan } from "./cuttingPlan";
import type { CutPartProductionOperation } from "./cuttingPlan";

export interface CuttingLabelPart {
  id: string;
  code: string;
  name: string;
  material: string;
  thicknessMm: number;
  edges: string;
  sourceReference?: string;
  productionOperations?: CutPartProductionOperation[];
}

export interface CuttingPieceLabel {
  id: string;
  projectId: string;
  projectTitle: string;
  revision: number;
  sheetNumber: number;
  partId: string;
  partCode: string;
  partName: string;
  instance: number;
  lengthMm: number;
  widthMm: number;
  thicknessMm: number;
  material: string;
  edges: string;
  sourceReference?: string;
  productionOperations?: CutPartProductionOperation[];
  rotatedInPlan: boolean;
  status: "preliminary-not-released";
}

export type CuttingLabelsResult =
  | { ok: true; labels: CuttingPieceLabel[] }
  | { ok: false; message: string };

/** Creates one traceable label per placed piece without inferring machining. */
export function createCuttingPieceLabels(
  project: { id: string; title: string },
  revision: number,
  parts: CuttingLabelPart[],
  plan: PreliminaryCutPlan,
): CuttingLabelsResult {
  if (!project.id.trim() || !project.title.trim() || !Number.isSafeInteger(revision) || revision <= 0) {
    return { ok: false, message: "Projeto e revisão válidos são obrigatórios para gerar etiquetas." };
  }
  if (!plan.ok) return { ok: false, message: "Conclua o plano antes de gerar etiquetas." };
  const byId = new Map(parts.map(part => [part.id, part]));
  const labels: CuttingPieceLabel[] = [];
  for (const sheet of plan.sheets) {
    for (const placement of sheet.placements) {
      const part = byId.get(placement.partId);
      if (!part) return { ok: false, message: `A peça ${placement.partId} não possui dados para etiqueta.` };
      labels.push({
        id: `${project.id}-r${revision}-s${sheet.number}-${part.id}-${placement.instance}`,
        projectId: project.id,
        projectTitle: project.title,
        revision,
        sheetNumber: sheet.number,
        partId: part.id,
        partCode: part.code,
        partName: part.name,
        instance: placement.instance,
        lengthMm: placement.lengthMm,
        widthMm: placement.widthMm,
        thicknessMm: part.thicknessMm,
        material: part.material,
        edges: part.edges,
        sourceReference: part.sourceReference,
        productionOperations: part.productionOperations?.map(operation => ({ ...operation })),
        rotatedInPlan: placement.rotated,
        status: "preliminary-not-released",
      });
    }
  }
  return { ok: true, labels };
}

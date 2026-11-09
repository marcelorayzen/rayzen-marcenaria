import { expandCompositePanel, type CompositePanel } from "./compositePanel";
import type { RectangularCutPart } from "./cuttingPlan";

export interface CompositePanelCutPart extends RectangularCutPart {
  panelId: string;
  layerId: string;
  revisionId: string;
  instance: number;
  sourceReference: string;
}

export type CompositePanelCuttingResult =
  | { ok: false; errors: string[] }
  | { ok: true; parts: CompositePanelCutPart[]; pending: string[] };

/**
 * Converts every physical layer into one rectangular cutting instance.
 * Bonding, grooves and edge banding remain explicit operations outside nesting.
 */
export function createCompositePanelCutParts(panel: CompositePanel): CompositePanelCuttingResult {
  const expansion = expandCompositePanel(panel);
  if (!expansion.ok) return expansion;
  return {
    ok: true,
    pending: [...expansion.pending],
    parts: expansion.blanks.map(blank => ({
      id: blank.id,
      panelId: blank.panelId,
      layerId: blank.layerId,
      revisionId: blank.revisionId,
      instance: blank.instance,
      sourceReference: panel.sourceReference,
      materialId: blank.materialId,
      thicknessMm: blank.thicknessMm,
      lengthMm: blank.cutLengthMm,
      widthMm: blank.cutWidthMm,
      quantity: 1,
      grain: blank.grain,
      allowRotation: blank.grain === "none",
    })),
  };
}

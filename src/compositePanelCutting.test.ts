import { describe, expect, it } from "vitest";
import type { CompositePanel } from "./compositePanel";
import { createCompositePanelCutParts } from "./compositePanelCutting";
import { createGroupedCuttingPlans } from "./groupedCuttingPlan";

function compositeDoor(): CompositePanel {
  return {
    id: "door-1",
    revisionId: "revision-3",
    sourceReference: "synthetic-multi-material-fixture",
    quantity: 2,
    layers: [
      { id: "front-15", materialId: "mdf-white-15", thicknessMm: 15, cutLengthMm: 700, cutWidthMm: 400, grain: "length" },
      { id: "back-6", materialId: "mdf-white-6", thicknessMm: 6, cutLengthMm: 680, cutWidthMm: 400, grain: "length" },
    ],
    edges: [{ side: "left", bandWidthMm: 22, bandThicknessMm: 0.45 }],
    operations: [
      { id: "bond", kind: "bonding", layerIds: ["front-15", "back-6"], specificationReference: "fixture-only" },
      { id: "groove", kind: "handle-groove", layerIds: ["front-15"], specificationReference: null },
    ],
  };
}

describe("composite panel to cutting parts", () => {
  it("keeps every layer traceable and separates 15 mm from 6 mm stock", () => {
    const result = createCompositePanelCutParts(compositeDoor());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.parts).toHaveLength(4);
    expect(result.parts.map(part => [part.layerId, part.instance, part.thicknessMm])).toEqual([
      ["front-15", 1, 15], ["back-6", 1, 6], ["front-15", 2, 15], ["back-6", 2, 6],
    ]);
    expect(result.parts.every(part => part.revisionId === "revision-3" && part.quantity === 1)).toBe(true);
    expect(result.pending).toEqual(["Detalhar operação groove."]);

    const grouped = createGroupedCuttingPlans(
      { lengthMm: 2750, widthMm: 1850, grain: "length" },
      { kerfMm: 3, trim: { topMm: 4, rightMm: 4, bottomMm: 4, leftMm: 4 } },
      result.parts,
    );
    expect(grouped.ok).toBe(true);
    if (!grouped.ok) return;
    expect(grouped.groups.map(group => [group.materialId, group.thicknessMm])).toEqual([
      ["mdf-white-15", 15], ["mdf-white-6", 6],
    ]);
  });

  it("does not turn an unspecified groove into cutting geometry", () => {
    const result = createCompositePanelCutParts(compositeDoor());
    expect(result.ok && result.parts.every(part =>
      part.lengthMm === 700 || part.lengthMm === 680,
    )).toBe(true);
    expect(result.ok && result.pending).toContain("Detalhar operação groove.");
  });
});

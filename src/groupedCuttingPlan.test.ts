import { describe, expect, it } from "vitest";
import { createGroupedCuttingPlans } from "./groupedCuttingPlan";
import type { RectangularCutPart } from "./cuttingPlan";

const stockTemplate = { lengthMm: 2750, widthMm: 1850, grain: "none" as const };
const settings = { kerfMm: 3, trim: { topMm: 4, rightMm: 4, bottomMm: 4, leftMm: 4 } };
const part: RectangularCutPart = {
  id: "side-15", materialId: "MDF branco", thicknessMm: 15,
  lengthMm: 720, widthMm: 500, quantity: 2, grain: "none", allowRotation: true,
};

describe("grouped cutting plans", () => {
  it("creates independent plans for every material and thickness", () => {
    const result = createGroupedCuttingPlans(stockTemplate, settings, [
      part,
      { ...part, id: "back-6", thicknessMm: 6, quantity: 1 },
      { ...part, id: "side-oak", materialId: "MDF amadeirado", quantity: 1 },
    ]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.groups).toHaveLength(3);
    expect(result.groups.map(group => [group.materialId, group.thicknessMm])).toEqual([
      ["MDF amadeirado", 15],
      ["MDF branco", 15],
      ["MDF branco", 6],
    ]);
    for (const group of result.groups) {
      expect(group.parts.every(candidate =>
        candidate.materialId === group.materialId && candidate.thicknessMm === group.thicknessMm,
      )).toBe(true);
      expect(group.comparison.selectedPlan.sheets.length).toBeGreaterThan(0);
    }
  });

  it("keeps a pending grain explicit in its material group", () => {
    const result = createGroupedCuttingPlans(
      { ...stockTemplate, grain: "pending" },
      settings,
      [{ ...part, grain: "pending" }],
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.pending).toContain("MDF branco 15 mm: Definir sentido do veio da chapa.");
  });

  it("rejects duplicate part IDs even when they belong to different groups", () => {
    const result = createGroupedCuttingPlans(stockTemplate, settings, [
      part,
      { ...part, materialId: "MDF amadeirado" },
    ]);
    expect(result).toEqual({
      ok: false,
      errors: ["ID de peça repetido entre grupos: side-15."],
      pending: [],
    });
  });
});

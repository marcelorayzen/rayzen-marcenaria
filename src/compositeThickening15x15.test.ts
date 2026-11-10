import { describe, expect, it } from "vitest";
import { expandCompositePanel } from "./compositePanel";
import { createCompositeThickening15x15 } from "./compositeThickening15x15";

describe("composite 15 + 15 thickening", () => {
  it("creates two equal-size 15 mm layers with nominal 30 mm thickness", () => {
    const result = createCompositeThickening15x15({
      id: "thickening-1", revisionId: "R1", sourceReference: "Regra da oficina",
      quantity: 1, lengthMm: 800, widthMm: 120, baseMaterialId: "MDF 15", reinforcementMaterialId: "MDF 15",
      grain: "none", bandedSides: ["left"],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const expanded = expandCompositePanel(result.panel);
    expect(expanded.ok && expanded.nominalThicknessMm).toBe(30);
    expect(expanded.ok && expanded.blanks.map(blank => [blank.thicknessMm, blank.cutLengthMm, blank.cutWidthMm])).toEqual([[15, 800, 120], [15, 800, 120]]);
  });
});

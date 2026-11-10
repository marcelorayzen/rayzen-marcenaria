import { describe, expect, it } from "vitest";
import { expandCompositePanel } from "./compositePanel";
import { createCompositeDoor15x6, type CompositeDoor15x6Input } from "./compositeDoor15x6";

const input: CompositeDoor15x6Input = {
  id: "door-1",
  revisionId: "revision-4",
  sourceReference: "Regra confirmada pela oficina em 09/11/2026",
  quantity: 2,
  lengthMm: 1000,
  widthMm: 500,
  frontMaterialId: "MDF branco 15",
  backMaterialId: "MDF branco 6",
  grain: "none",
  bandedSides: ["top", "left", "right"],
};

describe("composite 15 + 6 door", () => {
  it("creates equal-size layers and a nominal 21 mm panel", () => {
    const result = createCompositeDoor15x6(input);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.panel.layers.map(layer => [layer.thicknessMm, layer.cutLengthMm, layer.cutWidthMm])).toEqual([
      [15, 1000, 500],
      [6, 1000, 500],
    ]);
    const expansion = expandCompositePanel(result.panel);
    expect(expansion.ok && expansion.nominalThicknessMm).toBe(21);
    expect(expansion.ok && expansion.blanks).toHaveLength(4);
  });

  it("records 22 mm band only on selected sides and keeps groove geometry pending", () => {
    const result = createCompositeDoor15x6(input);
    if (!result.ok) throw new Error(result.errors.join(" "));
    expect(result.panel.edges).toEqual([
      { side: "top", bandWidthMm: 22, bandThicknessMm: null },
      { side: "left", bandWidthMm: 22, bandThicknessMm: null },
      { side: "right", bandWidthMm: 22, bandThicknessMm: null },
    ]);
    const expansion = expandCompositePanel(result.panel);
    expect(expansion.ok && expansion.pending).toContain("Detalhar operação handle-groove-15.");
  });

  it("rejects invalid dimensions, quantity and repeated band sides", () => {
    expect(createCompositeDoor15x6({ ...input, lengthMm: 0 }).ok).toBe(false);
    expect(createCompositeDoor15x6({ ...input, quantity: 1.5 }).ok).toBe(false);
    expect(createCompositeDoor15x6({ ...input, bandedSides: ["top", "top"] }).ok).toBe(false);
  });
});

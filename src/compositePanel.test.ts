import { describe, expect, it } from "vitest";
import { expandCompositePanel, reportedWorkshopBandWidthsMm, type CompositePanel } from "./compositePanel";

// Synthetic cut dimensions, not a workshop-approved door design.
function door(): CompositePanel {
  return {
    id: "door", revisionId: "r1", sourceReference: "synthetic-fixture", quantity: 2,
    layers: [
      { id: "front", materialId: "mdf-15", thicknessMm: 15, cutLengthMm: 700, cutWidthMm: 400, grain: "length" },
      { id: "back", materialId: "mdf-6", thicknessMm: 6, cutLengthMm: 700, cutWidthMm: 400, grain: "pending" },
    ],
    edges: [{ side: "left", bandWidthMm: 22, bandThicknessMm: null }],
    operations: [{ id: "groove", kind: "handle-groove", layerIds: ["front"], specificationReference: null }],
  };
}

describe("composite panel cut blanks", () => {
  it("records the reported workshop band widths without restricting project-specific choices", () => {
    expect(reportedWorkshopBandWidthsMm).toEqual([22, 35, 45, 60]);
  });
  it("expands two 21 mm doors into four blanks at their actual stock thicknesses", () => {
    const result = expandCompositePanel(door());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.nominalThicknessMm).toBe(21);
    expect(result.blanks.map(p => [p.thicknessMm, p.cutLengthMm])).toEqual([[15, 700], [6, 700], [15, 700], [6, 700]]);
    expect(new Set(result.blanks.map(p => p.id)).size).toBe(4);
    expect(result.blanks.every(p => p.revisionId === "r1")).toBe(true);
    expect(result.pending).toHaveLength(3);
  });
  it("keeps a specified 15 + 15 stack as two 15 mm blanks, not one 30 mm stock piece", () => {
    const panel = door();
    panel.quantity = 1;
    panel.layers[1].thicknessMm = 15;
    panel.edges = [];
    const result = expandCompositePanel(panel);
    expect(result.ok && result.nominalThicknessMm).toBe(30);
    expect(result.ok && result.blanks.map(p => p.thicknessMm)).toEqual([15, 15]);
  });
  it("rejects a 22 mm band for a nominal 30 mm stack", () => {
    const panel = door();
    panel.layers[1].thicknessMm = 15;
    expect(expandCompositePanel(panel).ok).toBe(false);
  });
  it.each([0, -1, 1.5, NaN, Infinity])("rejects invalid quantity %s", quantity => {
    expect(expandCompositePanel({ ...door(), quantity }).ok).toBe(false);
  });
  it("rejects missing layers and invalid dimensions or operation targets", () => {
    expect(expandCompositePanel({ ...door(), layers: [] }).ok).toBe(false);
    const panel = door();
    panel.layers[0].cutLengthMm = NaN;
    expect(expandCompositePanel(panel).ok).toBe(false);
    const other = door();
    other.operations[0].layerIds = ["missing"];
    expect(expandCompositePanel(other).ok).toBe(false);
  });
  it("does not mutate the source model", () => {
    const panel = door();
    const before = JSON.stringify(panel);
    const result = expandCompositePanel(panel);
    if (result.ok) result.blanks[0].cutWidthMm = 1;
    expect(JSON.stringify(panel)).toBe(before);
  });
});

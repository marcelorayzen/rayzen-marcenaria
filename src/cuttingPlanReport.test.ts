import { describe, expect, it } from "vitest";
import { createPreliminaryStripPlan, type RectangularCutPart } from "./cuttingPlan";
import { createCuttingPlanReport } from "./cuttingPlanReport";

const stock = {
  id: "sheet-1",
  materialId: "mdf-15",
  thicknessMm: 15,
  lengthMm: 2750,
  widthMm: 1850,
  grain: "none" as const,
};
const settings = { kerfMm: 3, trim: { topMm: 4, rightMm: 4, bottomMm: 4, leftMm: 4 } };
const parts: RectangularCutPart[] = [{
  id: "side",
  materialId: "mdf-15",
  thicknessMm: 15,
  lengthMm: 720,
  widthMm: 500,
  quantity: 2,
  grain: "none",
  allowRotation: true,
}];

describe("preliminary cutting report", () => {
  it("keeps project, revision, settings and every planned piece traceable", () => {
    const plan = createPreliminaryStripPlan(stock, settings, parts);
    const result = createCuttingPlanReport(
      { id: "project-1", title: "Cozinha" },
      3,
      stock,
      settings,
      parts,
      plan,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.report).toMatchObject({
      project: { id: "project-1", title: "Cozinha" },
      revision: 3,
      status: "preliminary-not-released",
      settings,
    });
    expect(result.report.sheets.flatMap(sheet => sheet.placements)).toHaveLength(2);
  });

  it("refuses reports for incomplete plans or mismatched quantities", () => {
    const incomplete = createPreliminaryStripPlan(
      { ...stock, grain: "pending" },
      settings,
      [{ ...parts[0], grain: "pending" }],
    );
    expect(createCuttingPlanReport({ id: "p", title: "P" }, 1, stock, settings, parts, incomplete).ok).toBe(false);

    const plan = createPreliminaryStripPlan(stock, settings, parts);
    const mismatch = createCuttingPlanReport(
      { id: "p", title: "P" },
      1,
      stock,
      settings,
      [{ ...parts[0], quantity: 3 }],
      plan,
    );
    expect(mismatch).toEqual({ ok: false, message: "A quantidade planejada da peça side não confere." });
  });
});

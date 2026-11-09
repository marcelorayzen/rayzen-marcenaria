import { describe, expect, it } from "vitest";
import { createPreliminaryStripPlan } from "./cuttingPlan";
import { createCuttingPieceLabels } from "./cuttingLabels";

const part = {
  id: "side",
  code: "BC-01",
  name: "Lateral",
  material: "MDF 15 mm",
  thicknessMm: 15,
  edges: "Sem fita",
  sourceReference: "Módulo paramétrico R2",
};
const stock = { id: "sheet", materialId: part.material, thicknessMm: 15, lengthMm: 2750, widthMm: 1850, grain: "none" as const };
const settings = { kerfMm: 3, trim: { topMm: 4, rightMm: 4, bottomMm: 4, leftMm: 4 } };
const cutPart = { ...part, materialId: part.material, lengthMm: 720, widthMm: 500, quantity: 2, grain: "none" as const, allowRotation: true };

describe("cutting piece labels", () => {
  it("creates one label per placement with project and revision traceability", () => {
    const plan = createPreliminaryStripPlan(stock, settings, [cutPart]);
    const result = createCuttingPieceLabels({ id: "project-1", title: "Cozinha" }, 2, [part], plan);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.labels).toHaveLength(2);
    expect(result.labels[1]).toMatchObject({
      projectId: "project-1",
      revision: 2,
      sheetNumber: 1,
      partCode: "BC-01",
      instance: 2,
      status: "preliminary-not-released",
      sourceReference: "Módulo paramétrico R2",
    });
  });

  it("refuses labels when a planned piece has no matching technical record", () => {
    const plan = createPreliminaryStripPlan(stock, settings, [cutPart]);
    expect(createCuttingPieceLabels({ id: "p", title: "P" }, 1, [], plan)).toEqual({
      ok: false,
      message: "A peça side não possui dados para etiqueta.",
    });
  });
});

import { describe, expect, it } from "vitest";
import type { CuttingPieceLabel } from "./cuttingLabels";
import type { CuttingPlanReport } from "./cuttingPlanReport";
import { createCuttingLabelsCsv, createCuttingPlanPackage } from "./cuttingPlanExport";

const report = {
  format: "rayzen-preliminary-cutting-report",
  formatVersion: 1,
  project: { id: "project-1", title: "Cozinha; cliente" },
  revision: 2,
  status: "preliminary-not-released",
  strategy: "largest-side",
  stock: { id: "sheet", materialId: "MDF", thicknessMm: 15, lengthMm: 2750, widthMm: 1850, grain: "none" },
  settings: { kerfMm: 3, trim: { topMm: 4, rightMm: 4, bottomMm: 4, leftMm: 4 } },
  parts: [],
  sheets: [{ number: 1, placements: [{ id: "x", partId: "side", instance: 1, xMm: 4, yMm: 4, lengthMm: 720, widthMm: 500, rotated: false, strip: 1 }], operations: [], usedPartAreaMm2: 360000, usableAreaMm2: 1 }],
  warning: "Documento preliminar",
} satisfies CuttingPlanReport;

const label = {
  id: "label-1", projectId: "project-1", projectTitle: "Cozinha; cliente", revision: 2,
  sheetNumber: 1, partId: "side", partCode: "BC-01", partName: "Lateral", instance: 1,
  lengthMm: 720, widthMm: 500, thicknessMm: 15, material: "MDF", edges: "Frente; fundo",
  rotatedInPlan: false, status: "preliminary-not-released",
  sourceReference: "Medição da visita",
} satisfies CuttingPieceLabel;

describe("cutting plan portable exports", () => {
  it("packages only matching report and labels", () => {
    const result = createCuttingPlanPackage(report, [label]);
    expect(result.ok && result.package).toMatchObject({
      format: "rayzen-preliminary-cutting-package",
      project: { id: "project-1" },
      revision: 2,
      status: "preliminary-not-released",
    });
    expect(createCuttingPlanPackage(report, [])).toEqual({
      ok: false,
      message: "A quantidade de etiquetas não confere com as peças posicionadas.",
    });
  });

  it("exports semicolon CSV with escaped text", () => {
    const csv = createCuttingLabelsCsv([label]);
    expect(csv).toContain('"Cozinha; cliente"');
    expect(csv).toContain('"Frente; fundo"');
    expect(csv).toContain("Medição da visita");
    expect(csv.split("\r\n")).toHaveLength(2);
  });
});

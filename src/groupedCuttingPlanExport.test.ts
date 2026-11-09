import { describe, expect, it } from "vitest";
import type { CuttingPlanPackage } from "./cuttingPlanExport";
import { createGroupedCuttingPlanPackage } from "./groupedCuttingPlanExport";

function cuttingPackage(materialId: string, thicknessMm: number, revision = 2): CuttingPlanPackage {
  return {
    format: "rayzen-preliminary-cutting-package",
    formatVersion: 1,
    project: { id: "project-1", title: "Cozinha" },
    revision,
    status: "preliminary-not-released",
    report: {
      format: "rayzen-preliminary-cutting-report", formatVersion: 1,
      project: { id: "project-1", title: "Cozinha" }, revision,
      status: "preliminary-not-released", strategy: "largest-side",
      stock: { id: "stock", materialId, thicknessMm, lengthMm: 2750, widthMm: 1850, grain: "none" },
      settings: { kerfMm: 3, trim: { topMm: 4, rightMm: 4, bottomMm: 4, leftMm: 4 } },
      parts: [], sheets: [], warning: "Preliminar",
    },
    labels: [],
  };
}

describe("grouped cutting package", () => {
  it("combines distinct stock groups from the same project revision", () => {
    const result = createGroupedCuttingPlanPackage([
      cuttingPackage("MDF branco", 15),
      cuttingPackage("MDF branco", 6),
    ]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.package).toMatchObject({
      format: "rayzen-preliminary-grouped-cutting-package",
      revision: 2,
      project: { id: "project-1" },
    });
    expect(result.package.groups).toHaveLength(2);
  });

  it("rejects duplicate stock groups and mixed revisions", () => {
    expect(createGroupedCuttingPlanPackage([
      cuttingPackage("MDF", 15), cuttingPackage("MDF", 15),
    ]).ok).toBe(false);
    expect(createGroupedCuttingPlanPackage([
      cuttingPackage("MDF", 15, 1), cuttingPackage("MDF", 6, 2),
    ])).toEqual({ ok: false, message: "Todos os grupos precisam pertencer ao mesmo projeto e revisão." });
  });
});

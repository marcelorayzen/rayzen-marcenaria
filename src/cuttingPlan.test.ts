import { describe, expect, it } from "vitest";
import {
  createPreliminaryStripPlan,
  reportedWorkshopCuttingSettings,
  reportedWorkshopSheet,
  reportedWorkshopTrimRangeMm,
  validatePreliminaryPlanGeometry,
  validateCuttingConfiguration,
  type RectangularCutPart,
} from "./cuttingPlan";

const part: RectangularCutPart = {
  id: "side-1",
  materialId: "mdf-15",
  thicknessMm: 15,
  lengthMm: 720,
  widthMm: 500,
  quantity: 2,
  grain: "none",
  allowRotation: true,
};

describe("cutting configuration", () => {
  it("records the reported 3 to 4 mm workshop trim range", () => {
    expect(reportedWorkshopTrimRangeMm).toEqual({ min: 3, max: 4 });
  });
  it("preserves the reported sheet and 3 mm kerf while keeping trim pending", () => {
    const sheet = { ...reportedWorkshopSheet, materialId: "mdf-15", thicknessMm: 15, grain: "none" as const };
    const result = validateCuttingConfiguration(sheet, reportedWorkshopCuttingSettings, [part]);
    expect(sheet).toMatchObject({ lengthMm: 2750, widthMm: 1850 });
    expect(reportedWorkshopCuttingSettings.kerfMm).toBe(3);
    expect(result.errors).toEqual([]);
    expect(result.pending).toHaveLength(4);
    expect(result.usableLengthMm).toBeNull();
  });

  it("calculates usable dimensions only when every trim is explicit", () => {
    const result = validateCuttingConfiguration(
      { ...reportedWorkshopSheet, materialId: "mdf-15", thicknessMm: 15, grain: "none" },
      { kerfMm: 3, trim: { topMm: 10, rightMm: 20, bottomMm: 10, leftMm: 20 } },
      [part],
    );
    expect(result).toMatchObject({ errors: [], pending: [], usableLengthMm: 2710, usableWidthMm: 1830 });
  });

  it("rejects incompatible material, thickness, quantity and oversized parts", () => {
    const result = validateCuttingConfiguration(
      { ...reportedWorkshopSheet, materialId: "mdf-15", thicknessMm: 15, grain: "none" },
      { kerfMm: 3, trim: { topMm: 0, rightMm: 0, bottomMm: 0, leftMm: 0 } },
      [{ ...part, materialId: "mdf-18", thicknessMm: 18, quantity: 1.5, lengthMm: 3000 }],
    );
    expect(result.errors).toHaveLength(3);
  });

  it("allows rotation only for parts without grain", () => {
    const settings = { kerfMm: 3, trim: { topMm: 0, rightMm: 0, bottomMm: 0, leftMm: 0 } };
    const sheet = { ...reportedWorkshopSheet, materialId: "mdf-15", thicknessMm: 15, grain: "none" as const };
    const rotated = { ...part, lengthMm: 1800, widthMm: 2600, grain: "none" as const };
    expect(validateCuttingConfiguration(sheet, settings, [rotated]).errors).toEqual([]);
    expect(validateCuttingConfiguration(sheet, settings, [{ ...rotated, grain: "length" }]).errors).toHaveLength(1);
  });

  it("blocks invalid kerf and refilo values", () => {
    const result = validateCuttingConfiguration(
      { ...reportedWorkshopSheet, materialId: "mdf-15", thicknessMm: 15, grain: "none" },
      { kerfMm: 0, trim: { topMm: -1, rightMm: 0, bottomMm: 0, leftMm: 0 } },
      [part],
    );
    expect(result.errors).toHaveLength(2);
  });

  it("creates a deterministic preliminary strip layout with kerf gaps", () => {
    const sheet = { ...reportedWorkshopSheet, materialId: "mdf-15", thicknessMm: 15, grain: "none" as const };
    const settings = { kerfMm: 3, trim: { topMm: 4, rightMm: 4, bottomMm: 4, leftMm: 4 } };
    const result = createPreliminaryStripPlan(sheet, settings, [part]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.sheets).toHaveLength(1);
    expect(result.sheets[0].placements).toHaveLength(2);
    const [first, second] = result.sheets[0].placements;
    expect(second.xMm - (first.xMm + first.lengthMm)).toBe(3);
    expect(result.sheets[0].usedPartAreaMm2).toBe(720 * 500 * 2);
    expect(result.sheets[0].operations.map(operation => operation.kind)).toEqual([
      "trim", "trim", "trim", "trim", "rip-strip", "crosscut-part", "crosscut-part",
    ]);
    expect(result.sheets[0].operations.map(operation => operation.sequence)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it("omits zero trim operations but keeps strip and part cuts", () => {
    const sheet = { ...reportedWorkshopSheet, materialId: "mdf-15", thicknessMm: 15, grain: "none" as const };
    const settings = { kerfMm: 3, trim: { topMm: 0, rightMm: 0, bottomMm: 0, leftMm: 0 } };
    const result = createPreliminaryStripPlan(sheet, settings, [{ ...part, quantity: 1 }]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.sheets[0].operations.map(operation => operation.kind)).toEqual(["rip-strip", "crosscut-part"]);
  });

  it("opens another sheet when the current sheet has no remaining strip space", () => {
    const sheet = { ...reportedWorkshopSheet, materialId: "mdf-15", thicknessMm: 15, grain: "none" as const };
    const settings = { kerfMm: 3, trim: { topMm: 4, rightMm: 4, bottomMm: 4, leftMm: 4 } };
    const large = { ...part, lengthMm: 2700, widthMm: 1800, quantity: 2, allowRotation: false };
    const result = createPreliminaryStripPlan(sheet, settings, [large]);
    expect(result.ok && result.sheets).toHaveLength(2);
  });

  it("refuses to plan while trim or grain remains pending", () => {
    const sheet = { ...reportedWorkshopSheet, materialId: "mdf-15", thicknessMm: 15 };
    const result = createPreliminaryStripPlan(sheet, reportedWorkshopCuttingSettings, [{ ...part, grain: "pending" }]);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.pending.length).toBeGreaterThan(0);
  });

  it("audits bounds, kerf separation, area and operation sequence", () => {
    const sheet = { ...reportedWorkshopSheet, materialId: "mdf-15", thicknessMm: 15, grain: "none" as const };
    const settings = { kerfMm: 3, trim: { topMm: 4, rightMm: 4, bottomMm: 4, leftMm: 4 } };
    const result = createPreliminaryStripPlan(sheet, settings, [part]);
    if (!result.ok) throw new Error(result.errors.join(" "));
    expect(validatePreliminaryPlanGeometry(sheet, settings, result.sheets)).toEqual([]);

    const invalid = JSON.parse(JSON.stringify(result.sheets)) as typeof result.sheets;
    invalid[0].placements[1].xMm = invalid[0].placements[0].xMm + invalid[0].placements[0].lengthMm + 1;
    invalid[0].usedPartAreaMm2 = 1;
    invalid[0].operations[0].sequence = 7;
    expect(validatePreliminaryPlanGeometry(sheet, settings, invalid)).toEqual(expect.arrayContaining([
      expect.stringContaining("não preservam a serra"),
      "Área utilizada divergente na chapa 1.",
      "Sequência de operações inválida na chapa 1.",
    ]));
  });
});

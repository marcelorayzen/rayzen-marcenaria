import { describe, expect, it } from "vitest";
import {
  reportedWorkshopCuttingSettings,
  reportedWorkshopSheet,
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
});

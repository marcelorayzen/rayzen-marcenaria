import { describe, expect, it } from "vitest";
import { createPreliminaryStripPlan } from "./cuttingPlan";
import { createCuttingMapAnnotations } from "./cuttingMapDimensions";

const stock = { id: "sheet", materialId: "MDF", thicknessMm: 15, lengthMm: 2750, widthMm: 1850, grain: "none" as const };
const settings = { kerfMm: 3, trim: { topMm: 4, rightMm: 3, bottomMm: 4, leftMm: 3 } };
const part = { id: "side", materialId: "MDF", thicknessMm: 15, lengthMm: 720, widthMm: 500, quantity: 2, grain: "none" as const, allowRotation: true };

describe("cutting map dimensions", () => {
  it("creates stock, usable-area and per-piece dimensions from the same geometry", () => {
    const plan = createPreliminaryStripPlan(stock, settings, [part]);
    if (!plan.ok) throw new Error(plan.errors.join(" "));
    const result = createCuttingMapAnnotations(stock, settings, plan.sheets[0]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.annotations.usableArea).toEqual({ x: 3, y: 4, width: 2744, height: 1842 });
    expect(result.annotations.dimensions.filter(item => item.scope === "stock").map(item => item.label)).toEqual(["2750 mm", "1850 mm"]);
    expect(result.annotations.dimensions.filter(item => item.scope === "usable").map(item => item.label)).toEqual(["útil 2744 mm", "útil 1842 mm"]);
    expect(result.annotations.dimensions.filter(item => item.scope === "part")).toHaveLength(4);
  });

  it("does not create dimensions while a trim is pending", () => {
    const plan = createPreliminaryStripPlan(stock, settings, [part]);
    if (!plan.ok) throw new Error(plan.errors.join(" "));
    expect(createCuttingMapAnnotations(
      stock,
      { ...settings, trim: { ...settings.trim, leftMm: null } },
      plan.sheets[0],
    )).toEqual({ ok: false, message: "Os quatro refilos são necessários para cotar o mapa." });
  });
});

import { describe, expect, it } from "vitest";
import {
  createCounterModel,
  createPartsCsv,
  validateCounter,
} from "./furnitureEngine";

const acceptanceParameters = {
  width: 800,
  height: 720,
  depth: 500,
  thickness: 18,
};

describe("deterministic counter model", () => {
  it("calculates two 764 mm inner panels at 800 mm external width", () => {
    const model = createCounterModel(acceptanceParameters);

    expect(model.parts.map((part) => [part.code, part.quantity])).toEqual([
      ["BC-01", 2],
      ["BC-02", 1],
      ["BC-03", 1],
    ]);
    expect(model.parts[1]?.length).toBe(764);
    expect(model.parts[2]?.length).toBe(764);
  });

  it("updates the inner panels to 864 mm at 900 mm external width", () => {
    const model = createCounterModel({
      ...acceptanceParameters,
      width: 900,
    });

    expect(model.parts[1]?.length).toBe(864);
    expect(model.parts[2]?.length).toBe(864);
  });

  it("rejects non-positive dimensions and widths that cannot fit both sides", () => {
    expect(
      validateCounter({ ...acceptanceParameters, depth: -1 }).length,
    ).toBeGreaterThan(0);
    expect(
      validateCounter({ ...acceptanceParameters, width: 36 }).some(
        (issue) => issue.field === "width",
      ),
    ).toBe(true);
    expect(() =>
      createCounterModel({ ...acceptanceParameters, thickness: 0 }),
    ).toThrow();
  });

  it("exports the exact model and revision in CSV", () => {
    const model = createCounterModel(acceptanceParameters);
    const csv = createPartsCsv(model, 3);

    expect(csv).toContain('"R03"');
    expect(csv).toContain('"BC-02";"Tampo";"1";"764";"500";"18"');
    expect(csv).toContain('"BC-03";"Base";"1";"764";"500";"18"');
  });
});

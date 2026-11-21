import { describe, expect, it } from "vitest";
import { formatMillimetresAsCentimetres } from "./measurementFormat";

describe("measurement format", () => {
  it("converts millimetres to centimetres with one decimal place", () => {
    expect(formatMillimetresAsCentimetres(1234)).toBe("123.4 cm");
    expect(formatMillimetresAsCentimetres(18)).toBe("1.8 cm");
  });
});

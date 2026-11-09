import { describe, expect, it } from "vitest";
import { getRoleCapabilities } from "./roleCapabilities";

describe("role capabilities", () => {
  it("gives Marcelo technical release access", () => {
    expect(getRoleCapabilities(["marceneiro"])).toEqual({
      canEditProject: true,
      canValidateCommercial: false,
      canReleaseProduction: true,
    });
  });

  it("keeps a representative outside technical release", () => {
    expect(getRoleCapabilities(["representante"])).toEqual({
      canEditProject: true,
      canValidateCommercial: true,
      canReleaseProduction: false,
    });
  });

  it("combines both responsibilities without losing either capability", () => {
    expect(getRoleCapabilities(["marceneiro", "representante"])).toEqual({
      canEditProject: true,
      canValidateCommercial: true,
      canReleaseProduction: true,
    });
  });
});

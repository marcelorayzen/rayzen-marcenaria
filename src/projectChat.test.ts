import { describe, expect, it } from "vitest";
import { parseProjectChatMessage } from "./projectChat";

describe("project chat", () => {
  it("parses a natural width request", () => {
    expect(parseProjectChatMessage("a largura deve ser 900 mm")).toEqual({
      kind: "set-counter-width",
      value: 900,
    });
  });

  it("asks for a supported measurement when ambiguous", () => {
    expect(parseProjectChatMessage("mude o balcao").kind).toBe("unsupported");
  });

  it("drafts a plumbing constraint from field language", () => {
    expect(parseProjectChatMessage("o cano de esgoto esta a 2 metros do lado esquerdo e 30 cm do chao")).toEqual({
      kind: "draft-constraint",
      label: "Saida de esgoto",
      x: 2000,
      y: 300,
      dimensionLabel: "diametro",
    });
  });
});

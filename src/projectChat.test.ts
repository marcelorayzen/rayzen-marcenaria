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
});

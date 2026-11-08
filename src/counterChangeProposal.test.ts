import { describe, expect, it } from "vitest";
import {
  previewSetCounterDimensionProposal,
  validateSetCounterDimensionProposal,
} from "./counterChangeProposal";

const baseParameters = {
  width: 800,
  height: 720,
  depth: 500,
  thickness: 18,
};

describe("structured counter change proposal", () => {
  it("previews a valid width change through the deterministic model", () => {
    const preview = previewSetCounterDimensionProposal(
      {
        operation: "set-counter-dimension",
        baseRevisionId: "revision-1",
        field: "width",
        currentValue: 800,
        proposedValue: 900,
        unit: "mm",
        reason: "Pedido explícito do cliente.",
        proposedBy: "assistant",
      },
      baseParameters,
    );

    expect(preview.before.parts[1]?.length).toBe(764);
    expect(preview.after.parts[1]?.length).toBe(864);
  });

  it("rejects a proposal made against an outdated revision value", () => {
    expect(
      validateSetCounterDimensionProposal(
        {
          operation: "set-counter-dimension",
          baseRevisionId: "revision-1",
          field: "width",
          currentValue: 750,
          proposedValue: 900,
          unit: "mm",
          reason: "Pedido explícito do cliente.",
          proposedBy: "assistant",
        },
        baseParameters,
      ),
    ).toContainEqual({
      path: "currentValue",
      message: "O valor atual não corresponde à revisão-base.",
    });
  });

  it("rejects an invalid proposal instead of producing a partial model", () => {
    expect(
      validateSetCounterDimensionProposal(
        {
          operation: "set-counter-dimension",
          baseRevisionId: "revision-1",
          field: "width",
          currentValue: 800,
          proposedValue: 36,
          unit: "mm",
          reason: "Tentativa inválida.",
          proposedBy: "internal",
        },
        baseParameters,
      ),
    ).toContainEqual({
      path: "proposedValue.width",
      message: "A largura precisa comportar as duas laterais.",
    });
  });
});

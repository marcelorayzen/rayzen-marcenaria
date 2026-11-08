import { describe, expect, it } from "vitest";
import {
  type ProjectSpecification,
  validateProjectSpecifications,
  validateSpecificationChangeProposal,
} from "./projectSpecifications";

const specifications: ProjectSpecification[] = [
  {
    id: "hardware-1",
    scopeId: "cabinet-1",
    label: "Ferragem da dobradiça",
    value: "conforme Promob",
    status: "proposed",
    source: { kind: "promob", referenceId: "promob-export-1" },
  },
];

describe("project-specific specifications", () => {
  it("accepts a project-specific Promob specification without turning it into a global rule", () => {
    expect(validateProjectSpecifications(specifications)).toEqual([]);
  });

  it("rejects a specification without a traceable source", () => {
    const invalid = specifications.map((specification) => ({
      ...specification,
      source: { ...specification.source },
    }));
    invalid[0]!.source.referenceId = "";

    expect(validateProjectSpecifications(invalid)).toContainEqual({
      path: "specifications[0].source.referenceId",
      message: "Informe um texto não vazio.",
    });
  });

  it("requires a human decision for an accepted assistant proposal", () => {
    expect(
      validateSpecificationChangeProposal(
        {
          id: "proposal-1",
          specificationId: "hardware-1",
          baseRevisionId: "revision-1",
          proposedValue: "dobradiça com amortecimento",
          reason: "Solicitação registrada na revisão.",
          proposedBy: "assistant",
          status: "accepted",
        },
        specifications,
      ),
    ).toEqual(
      expect.arrayContaining([
        { path: "decidedBy", message: "Informe um texto não vazio." },
        { path: "decidedAt", message: "Informe uma data válida." },
      ]),
    );
  });

  it("accepts a proposal when a human records the decision", () => {
    expect(
      validateSpecificationChangeProposal(
        {
          id: "proposal-1",
          specificationId: "hardware-1",
          baseRevisionId: "revision-1",
          proposedValue: "dobradiça com amortecimento",
          reason: "Solicitação registrada na revisão.",
          proposedBy: "assistant",
          status: "accepted",
          decidedBy: "marceneiro-1",
          decidedAt: "2026-11-08T16:00:00.000Z",
        },
        specifications,
      ),
    ).toEqual([]);
  });
});

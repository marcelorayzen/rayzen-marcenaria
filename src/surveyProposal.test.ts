import { describe, expect, it } from "vitest";
import { fixtureSnapshot } from "./testSnapshots";
import {
  applySurveyProposal,
  MAX_SURVEY_OPERATIONS,
  parseSurveyProposal,
  validateSurveyProposal,
  type SurveyProposalBatch,
} from "./surveyProposal";
import type { ProjectSnapshot } from "./projectDomain";

function snapshotWithPhoto(): ProjectSnapshot {
  const base = fixtureSnapshot(1);
  return {
    ...base,
    evidence: [
      { id: "photo-1", kind: "photo", label: "Parede da pia",
        attribution: { origin: "field", recordedBy: "fixture", recordedAt: base.revision.createdAt, confidence: "observed" } },
      { id: "doc-1", kind: "document", label: "Planta",
        attribution: { origin: "document", recordedBy: "fixture", recordedAt: base.revision.createdAt, confidence: "informed" } },
    ],
  };
}

/** Illustrative values only — not workshop data. */
function rawProposal(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    format: "rayzen-survey-proposal",
    formatVersion: 1,
    baseRevisionId: "revision-1",
    source: { kind: "assistant", provider: "fixture-provider", model: "fixture-model" },
    operations: [
      { op: "add-measurement", tempId: "m-1", label: "Largura da parede", value: 2400, unit: "mm",
        context: "Leitura da trena na foto", evidenceIds: ["photo-1"] },
      { op: "add-observation", tempId: "o-1", text: "Tomada próxima ao canto", evidenceIds: ["photo-1"] },
      { op: "add-pending-item", tempId: "p-1", description: "Conferir largura com trena", sourceRecordIds: ["m-1"] },
    ],
    ...overrides,
  };
}

function parsed(overrides: Record<string, unknown> = {}): SurveyProposalBatch {
  const result = parseSurveyProposal(rawProposal(overrides));
  if (result.status !== "valid") throw new Error(JSON.stringify(result.issues));
  return result.batch;
}

const context = { acceptedBy: "user-1", acceptedAt: "2026-11-11T12:00:00.000Z", newId: (id: string) => `rec-${id}` };

describe("parseSurveyProposal", () => {
  it("accepts a well-formed batch", () => {
    expect(parsed().operations).toHaveLength(3);
  });

  it("refuses unknown operations, formats and bad values", () => {
    const result = parseSurveyProposal(rawProposal({
      format: "other",
      operations: [
        { op: "release-production", tempId: "x-1" },
        { op: "add-measurement", tempId: "m-1", label: "L", value: -5, unit: "cm", context: "c", evidenceIds: ["photo-1"] },
        { op: "add-observation", tempId: "BAD ID", text: "", evidenceIds: [] },
      ],
    }));
    expect(result.status).toBe("invalid");
    if (result.status !== "invalid") return;
    const paths = result.issues.map(issue => issue.path);
    expect(paths).toEqual(expect.arrayContaining([
      "format", "operations[0].op", "operations[1].value", "operations[1].unit",
      "operations[2].tempId", "operations[2].text", "operations[2].evidenceIds",
    ]));
  });

  it("limits the batch size and requires an identified assistant", () => {
    const many = Array.from({ length: MAX_SURVEY_OPERATIONS + 1 }, (_, index) => ({
      op: "add-observation", tempId: `o-${index}`, text: "x", evidenceIds: ["photo-1"],
    }));
    expect(parseSurveyProposal(rawProposal({ operations: many })).status).toBe("invalid");
    expect(parseSurveyProposal(rawProposal({ source: { kind: "human" } })).status).toBe("invalid");
    expect(parseSurveyProposal("texto livre").status).toBe("invalid");
  });
});

describe("validateSurveyProposal", () => {
  it("requires the exact base revision and photos of this revision", () => {
    const snapshot = snapshotWithPhoto();
    expect(validateSurveyProposal(parsed(), snapshot)).toEqual([]);
    expect(validateSurveyProposal(parsed({ baseRevisionId: "revision-0" }), snapshot)[0].path).toBe("baseRevisionId");
    const docEvidence = parsed({ operations: [
      { op: "add-observation", tempId: "o-1", text: "x", evidenceIds: ["doc-1"] },
    ] });
    expect(validateSurveyProposal(docEvidence, snapshot)).toHaveLength(1);
  });

  it("refuses unknown pending sources and repeated temp ids", () => {
    const batch = parsed({ operations: [
      { op: "add-pending-item", tempId: "p-1", description: "x", sourceRecordIds: ["ghost"] },
      { op: "add-observation", tempId: "photo-1", text: "x", evidenceIds: ["photo-1"] },
    ] });
    expect(validateSurveyProposal(batch, snapshotWithPhoto()).map(issue => issue.path))
      .toEqual(["operations[1].tempId", "operations[0].sourceRecordIds"]);
  });
});

describe("applySurveyProposal", () => {
  it("applies accepted items as estimated, attributed to the accepting person", () => {
    const snapshot = snapshotWithPhoto();
    const result = applySurveyProposal(snapshot, parsed(), { "m-1": "accept", "o-1": "reject", "p-1": "accept" }, context);
    expect(result.status).toBe("applied");
    if (result.status !== "applied") return;
    expect(result.acceptedCount).toBe(2);
    expect(result.snapshot.measurements).toEqual([expect.objectContaining({
      id: "rec-m-1", value: 2400,
      attribution: expect.objectContaining({
        recordedBy: "user-1", confidence: "estimated",
        proposedBy: { kind: "assistant", provider: "fixture-provider", model: "fixture-model" },
      }),
    })]);
    expect(result.snapshot.observations).toEqual([]);
    expect(result.snapshot.pendingItems[0].sourceRecordIds).toEqual(["rec-m-1"]);
    expect(snapshot.measurements).toEqual([]);
  });

  it("requires a decision for every item", () => {
    const result = applySurveyProposal(snapshotWithPhoto(), parsed(), { "m-1": "accept" }, context);
    expect(result.status).toBe("invalid");
  });

  it("refuses a pending item that depends on a rejected proposal, without partial changes", () => {
    const result = applySurveyProposal(snapshotWithPhoto(), parsed(), { "m-1": "reject", "o-1": "accept", "p-1": "accept" }, context);
    expect(result).toMatchObject({ status: "invalid", issues: [{ path: "operations[2].sourceRecordIds" }] });
  });

  it("refuses when nothing was accepted or the revision changed", () => {
    expect(applySurveyProposal(snapshotWithPhoto(), parsed(), { "m-1": "reject", "o-1": "reject", "p-1": "reject" }, context).status)
      .toBe("invalid");
    const moved = { ...snapshotWithPhoto(), revision: { id: "revision-2", number: 2, createdAt: "2026-11-11T00:00:00.000Z" } };
    expect(applySurveyProposal(moved, parsed(), { "m-1": "accept", "o-1": "accept", "p-1": "accept" }, context).status)
      .toBe("invalid");
  });
});

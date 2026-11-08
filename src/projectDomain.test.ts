import { describe, expect, it } from "vitest";
import {
  PROJECT_SCHEMA_VERSION,
  type ProjectSnapshot,
  validateDraftSynchronization,
  validateProjectSnapshot,
} from "./projectDomain";

const recordedAt = "2026-11-08T15:00:00.000Z";

function createSnapshot(): ProjectSnapshot {
  return {
    schemaVersion: PROJECT_SCHEMA_VERSION,
    project: { id: "project-1", title: "Cozinha de ensaio" },
    revision: { id: "revision-1", number: 1, createdAt: recordedAt },
    evidence: [
      {
        id: "photo-1",
        kind: "photo",
        label: "Parede da pia",
        attribution: {
          origin: "field",
          recordedBy: "responsavel-projeto",
          recordedAt,
          confidence: "observed",
        },
      },
    ],
    measurements: [
      {
        id: "measurement-1",
        label: "Altura da saída de esgoto",
        value: 300,
        unit: "mm",
        context: "A partir do piso acabado",
        attribution: {
          origin: "field",
          recordedBy: "responsavel-projeto",
          recordedAt,
          confidence: "measured",
        },
        evidenceIds: ["photo-1"],
      },
    ],
    observations: [
      {
        id: "observation-1",
        text: "Suporte da pia visível ao lado da saída.",
        attribution: {
          origin: "field",
          recordedBy: "responsavel-projeto",
          recordedAt,
          confidence: "observed",
        },
        evidenceIds: ["photo-1"],
      },
    ],
    pendingItems: [
      {
        id: "pending-1",
        description: "Confirmar a profundidade útil do suporte da pia.",
        attribution: {
          origin: "field",
          recordedBy: "responsavel-projeto",
          recordedAt,
          confidence: "observed",
        },
        sourceRecordIds: ["observation-1"],
      },
    ],
    physicalConstraints: [
      {
        id: "constraint-1",
        kind: "plumbing-outlet",
        label: "Saída de esgoto da pia",
        position: {
          x: 2000,
          y: 300,
          reference: "Canto esquerdo da parede, olhando de frente",
        },
        dimensions: [{ label: "diâmetro observado", value: 40, unit: "mm" }],
        attribution: {
          origin: "field",
          recordedBy: "responsavel-projeto",
          recordedAt,
          confidence: "measured",
        },
        sourceRecordIds: ["measurement-1", "photo-1"],
      },
    ],
    furniture: [
      {
        id: "counter-1",
        kind: "counter",
        label: "Balcão da pia",
        parameters: { width: 800, height: 720, depth: 500, thickness: 18 },
        attribution: {
          origin: "field",
          recordedBy: "responsavel-projeto",
          recordedAt,
          confidence: "measured",
        },
      },
    ],
    specifications: [],
  };
}

describe("project domain contract", () => {
  it("accepts a traceable measurement and physical constraint", () => {
    expect(validateProjectSnapshot(createSnapshot())).toEqual([]);
  });

  it("links a completed pending item to the measurement that resolved it", () => {
    const snapshot = createSnapshot();
    snapshot.pendingItems[0]!.resolvedByRecordId = "measurement-1";

    expect(validateProjectSnapshot(snapshot)).toEqual([]);
  });

  it("validates a wall only when its dimensions point to recorded sources", () => {
    const snapshot = createSnapshot();
    snapshot.walls = [
      {
        id: "wall-1",
        label: "Parede da pia",
        width: 3000,
        height: 2600,
        unit: "mm",
        attribution: {
          origin: "field",
          recordedBy: "responsavel-projeto",
          recordedAt,
          confidence: "measured",
        },
        sourceRecordIds: ["measurement-1"],
      },
    ];

    expect(validateProjectSnapshot(snapshot)).toEqual([]);

    snapshot.walls[0]!.sourceRecordIds = ["missing-measurement"];
    expect(validateProjectSnapshot(snapshot)).toContainEqual({
      path: "walls[0].sourceRecordIds[0]",
      message: "O registro de origem não existe no snapshot.",
    });
  });

  it("rejects a counter placement that points to a missing wall", () => {
    const snapshot = createSnapshot();
    snapshot.furniture[0]!.placement = {
      wallId: "missing-wall",
      x: 0,
      y: 0,
      reference: "Canto esquerdo da parede",
    };

    expect(validateProjectSnapshot(snapshot)).toContainEqual({
      path: "furniture[0].placement.wallId",
      message: "A parede selecionada não existe no snapshot.",
    });
  });

  it("rejects a measurement that points to missing evidence", () => {
    const snapshot = createSnapshot();
    snapshot.measurements[0]!.evidenceIds = ["missing-photo"];

    expect(validateProjectSnapshot(snapshot)).toContainEqual({
      path: "measurements[0].evidenceIds[0]",
      message: "A evidência referenciada não existe no snapshot.",
    });
  });

  it("rejects an untraceable physical constraint instead of inferring a recess", () => {
    const snapshot = createSnapshot();
    snapshot.physicalConstraints[0]!.sourceRecordIds = [];
    snapshot.physicalConstraints[0]!.dimensions = [];

    const issues = validateProjectSnapshot(snapshot);

    expect(issues).toContainEqual({
      path: "physicalConstraints[0].sourceRecordIds",
      message: "Informe ao menos um registro de origem.",
    });
    expect(issues).toContainEqual({
      path: "physicalConstraints[0].dimensions",
      message: "A interferência precisa ter ao menos uma dimensão declarada.",
    });
  });

  it("keeps estimated information explicit and rejects invalid dimensions", () => {
    const snapshot = createSnapshot();
    snapshot.measurements[0]!.attribution.confidence = "estimated";
    snapshot.physicalConstraints[0]!.dimensions[0]!.value = 0;

    expect(validateProjectSnapshot(snapshot)).toContainEqual({
      path: "physicalConstraints[0].dimensions[0].value",
      message: "Informe um número maior que zero.",
    });
  });

  it("rejects an invalid counter instance in the same project snapshot", () => {
    const snapshot = createSnapshot();
    snapshot.furniture[0]!.parameters.width = 36;

    expect(validateProjectSnapshot(snapshot)).toContainEqual({
      path: "furniture[0].parameters.width",
      message: "A largura precisa comportar as duas laterais.",
    });
  });

  it("represents an offline conflict explicitly instead of silently merging it", () => {
    expect(
      validateDraftSynchronization({
        state: "conflict",
        baseRevisionId: "revision-1",
      }),
    ).toEqual([]);

    expect(
      validateDraftSynchronization({ state: "conflict" }),
    ).toContainEqual({
      path: "baseRevisionId",
      message: "Informe a revisão-base para sincronizar ou resolver conflito.",
    });
  });

  it("keeps synchronization failures visible", () => {
    expect(
      validateDraftSynchronization({ state: "sync-failed" }),
    ).toContainEqual({
      path: "failureMessage",
      message: "Explique a falha de sincronização para orientar a pessoa usuária.",
    });
  });
});

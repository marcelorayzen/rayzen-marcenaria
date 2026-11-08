import { describe, expect, it } from "vitest";
import {
  findConstraintsInsideFurniture,
  projectConstraintsOnWall,
  projectFurnitureOnWall,
} from "./wallElevation";

const recordedAt = "2026-11-08T15:00:00.000Z";

describe("wall elevation projection", () => {
  it("projects a recorded constraint without inventing its physical size", () => {
    const [marker] = projectConstraintsOnWall(
      {
        id: "wall-1",
        label: "Parede",
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
      [
        {
          id: "constraint-1",
          kind: "plumbing-outlet",
          label: "Saída de esgoto",
          position: { x: 2000, y: 300, reference: "Canto esquerdo" },
          dimensions: [{ label: "diâmetro", value: 40, unit: "mm" }],
          attribution: {
            origin: "field",
            recordedBy: "responsavel-projeto",
            recordedAt,
            confidence: "measured",
          },
          sourceRecordIds: ["measurement-1"],
        },
      ],
    );

    expect(marker?.inBounds).toBe(true);
    expect(marker?.xPercent).toBeCloseTo(66.67, 2);
    expect(marker?.yPercent).toBeCloseTo(88.46, 2);
  });

  it("keeps furniture placement explicit and flags an out-of-bounds counter", () => {
    const projection = projectFurnitureOnWall(
      {
        id: "wall-1", label: "Parede", width: 1000, height: 1000, unit: "mm",
        attribution: { origin: "field", recordedBy: "responsavel-projeto", recordedAt, confidence: "measured" },
        sourceRecordIds: ["measurement-1"],
      },
      { wallId: "wall-1", x: 300, y: 0, reference: "Canto esquerdo" },
      { width: 800, height: 720 },
    );

    expect(projection).toMatchObject({ leftPercent: 30, widthPercent: 80, inBounds: false });
  });

  it("flags an interference point within the counter rectangle without proposing a recess", () => {
    const constraints = [
      {
        id: "inside", kind: "plumbing-outlet" as const, label: "Saída", position: { x: 500, y: 300, reference: "Canto" },
        dimensions: [{ label: "diâmetro", value: 40, unit: "mm" as const }],
        attribution: { origin: "field" as const, recordedBy: "responsavel-projeto", recordedAt, confidence: "measured" as const }, sourceRecordIds: ["measurement-1"],
      },
      {
        id: "outside", kind: "opening" as const, label: "Vão", position: { x: 1400, y: 300, reference: "Canto" },
        dimensions: [{ label: "largura", value: 500, unit: "mm" as const }],
        attribution: { origin: "field" as const, recordedBy: "responsavel-projeto", recordedAt, confidence: "measured" as const }, sourceRecordIds: ["measurement-1"],
      },
    ];

    expect(findConstraintsInsideFurniture(
      { wallId: "wall-1", x: 0, y: 0, reference: "Canto" },
      { width: 800, height: 720 },
      constraints,
    ).map((constraint) => constraint.id)).toEqual(["inside"]);
  });
});

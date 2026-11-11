import { describe, expect, it } from "vitest";
import { deriveRevisionParts, normalizeRemotePartRow } from "./revisionParts";
import { fixtureSnapshot } from "./testSnapshots";

describe("revision parts derived for remote storage", () => {
  it("derives the engine parts of a saved revision with millimetre columns", () => {
    const result = deriveRevisionParts(fixtureSnapshot(1));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.parts.map(part => part.piece_code)).toEqual(["BC-01", "BC-02", "BC-03"]);
    expect(result.parts[1]).toEqual({
      piece_code: "BC-02", name: "Tampo", quantity: 1,
      length_mm: 764, width_mm: 500, thickness_mm: 18, material: "MDF 18 mm", edges: "Sem fita",
    });
  });

  it("prefixes codes by furniture position when the revision has several items", () => {
    const snapshot = fixtureSnapshot(1);
    snapshot.furniture.push({ ...snapshot.furniture[0]!, id: "counter-2", label: "Balcão 2" });
    const result = deriveRevisionParts(snapshot);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.parts.map(part => part.piece_code)).toEqual([
      "M1-BC-01", "M1-BC-02", "M1-BC-03", "M2-BC-01", "M2-BC-02", "M2-BC-03",
    ]);
    // Two identical 800 mm counters keep the same dimensions but distinct codes.
    expect(result.parts.find(part => part.piece_code === "M2-BC-02")?.length_mm).toBe(764);
  });

  it("refuses measurements that numeric(10,2) would round silently", () => {
    const snapshot = fixtureSnapshot(1);
    snapshot.furniture[0]!.parameters.thickness = 18.333;
    expect(deriveRevisionParts(snapshot)).toMatchObject({ ok: false });
  });

  it("refuses invalid furniture parameters", () => {
    const snapshot = fixtureSnapshot(1);
    snapshot.furniture[0]!.parameters.width = 20;
    expect(deriveRevisionParts(snapshot)).toMatchObject({ ok: false });
  });

  it("normalizes numeric columns returned as strings", () => {
    expect(normalizeRemotePartRow({
      piece_code: "BC-01", name: "Lateral", quantity: 2, length_mm: "720.00", width_mm: "500", thickness_mm: 18, material: "MDF 18 mm", edges: "Sem fita",
    })).toMatchObject({ length_mm: 720, width_mm: 500 });
  });
});

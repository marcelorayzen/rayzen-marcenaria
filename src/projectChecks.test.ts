import { describe, expect, it } from "vitest";
import { PROJECT_SCHEMA_VERSION, type ProjectSnapshot } from "./projectDomain";
import { getProjectChecks } from "./projectChecks";

function snapshot(): ProjectSnapshot {
  return {
    schemaVersion: PROJECT_SCHEMA_VERSION,
    project: { id: "project-1", title: "Ensaio" },
    revision: { id: "revision-1", number: 1, createdAt: "2026-11-08T17:00:00.000Z" },
    evidence: [], measurements: [], observations: [], pendingItems: [{
      id: "pending-1", description: "Conferir", sourceRecordIds: [],
      attribution: { origin: "field", recordedBy: "responsavel", recordedAt: "2026-11-08T17:00:00.000Z", confidence: "observed" },
    }], physicalConstraints: [], walls: [], specifications: [], furniture: [{
      id: "counter-1", kind: "counter", label: "Balcão", parameters: { width: 800, height: 720, depth: 500, thickness: 18 },
      attribution: { origin: "field", recordedBy: "responsavel", recordedAt: "2026-11-08T17:00:00.000Z", confidence: "measured" },
    }],
  };
}

describe("local project checks", () => {
  it("makes unresolved information visible without calling it a production release", () => {
    expect(getProjectChecks(snapshot())).toEqual([
      { id: "open-pending", message: "1 pendência(s) ainda aberta(s)." },
      { id: "missing-placement:counter-1", message: "Balcão ainda não está posicionado em uma parede." },
    ]);
  });
});

import { describe, expect, it } from "vitest";
import { getManufacturingReadiness } from "./manufacturingReadiness";
import type { ProjectSnapshot } from "./projectDomain";

const snapshot: ProjectSnapshot = {
  schemaVersion: 1,
  project: { id: "p1", title: "Projeto" },
  revision: { id: "r1", number: 1, createdAt: "2026-11-10T00:00:00.000Z" },
  evidence: [], measurements: [], observations: [], pendingItems: [], physicalConstraints: [], furniture: [], specifications: [],
};

describe("manufacturing readiness", () => {
  it("never reports technical release as ready", () => {
    const result = getManufacturingReadiness(snapshot);
    expect(result.ready).toBe(false);
    expect(result.items.find(item => item.id === "technical-release")).toMatchObject({ status: "blocked" });
  });
});

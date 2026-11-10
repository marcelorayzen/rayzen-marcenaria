import { describe, expect, it } from "vitest";
import { PROJECT_SCHEMA_VERSION, type ProjectSnapshot } from "./projectDomain";
import { validateLocalProjectBackup } from "./projectBackup";

const snapshot: ProjectSnapshot = {
  schemaVersion: PROJECT_SCHEMA_VERSION,
  project: { id: "project-1", title: "Teste" },
  revision: { id: "revision-1", number: 1, createdAt: "2026-11-08T18:00:00.000Z" },
  evidence: [], measurements: [], observations: [], pendingItems: [], physicalConstraints: [], furniture: [], specifications: [],
};

describe("local project backup", () => {
  it("accepts a recognized backup without writing it anywhere", () => {
    const result = validateLocalProjectBackup(JSON.stringify({
      format: "rayzen-marcenaria-local-backup",
      exportedAt: "2026-11-08T18:01:00.000Z",
      snapshots: [snapshot],
    }));
    expect(result.ok).toBe(true);
  });

  it("validates the optional project catalog carried by a backup", () => {
    const result = validateLocalProjectBackup(JSON.stringify({
      format: "rayzen-marcenaria-local-backup",
      exportedAt: "2026-11-08T18:01:00.000Z",
      snapshots: [snapshot],
      catalogItems: [{ id: "catalog-1", code: "PT-01", name: "Porta", kind: "door", manufacturer: null, specifications: { profile: "J" }, sourceReference: "Oficina", active: true }],
    }));
    expect(result.ok).toBe(true);
    expect(validateLocalProjectBackup(JSON.stringify({
      format: "rayzen-marcenaria-local-backup",
      exportedAt: "2026-11-08T18:01:00.000Z",
      snapshots: [snapshot],
      catalogItems: [{ id: "catalog-1", code: "PT-01", name: "Porta", kind: "door", manufacturer: null, specifications: { profile: "" }, sourceReference: "Oficina", active: true }],
    }))).toMatchObject({ ok: false });
  });

  it("rejects invalid JSON and discontinuous revisions", () => {
    expect(validateLocalProjectBackup("no-json")).toMatchObject({ ok: false });
    expect(validateLocalProjectBackup(JSON.stringify({
      format: "rayzen-marcenaria-local-backup",
      exportedAt: "2026-11-08T18:01:00.000Z",
      snapshots: [{ ...snapshot, revision: { ...snapshot.revision, number: 2 } }],
    }))).toMatchObject({ ok: false });
  });
});

import { PROJECT_SCHEMA_VERSION, type ProjectSnapshot } from "./projectDomain";

/** Test fixture only: dimensions are illustrative, not workshop data. */
export function fixtureSnapshot(
  number: number,
  width = 800,
  projectId = "project-local-1",
): ProjectSnapshot {
  const recordedAt = `2026-11-10T1${number}:00:00.000Z`;
  return {
    schemaVersion: PROJECT_SCHEMA_VERSION,
    project: { id: projectId, title: "Projeto de ensaio" },
    revision: { id: `revision-${number}`, number, createdAt: recordedAt },
    evidence: [],
    measurements: [],
    observations: [],
    pendingItems: [],
    physicalConstraints: [],
    walls: [],
    furniture: [{
      id: "counter-1",
      kind: "counter",
      label: "Balcão",
      parameters: { width, height: 720, depth: 500, thickness: 18 },
      attribution: { origin: "field", recordedBy: "fixture", recordedAt, confidence: "measured" },
    }],
    specifications: [],
  };
}

/** Emulates Postgres jsonb, which does not preserve object key order. */
export function reverseKeys<T>(value: T): T {
  if (Array.isArray(value)) return value.map(reverseKeys) as T;
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).reverse().map(([key, entry]) => [key, reverseKeys(entry)]),
    ) as T;
  }
  return value;
}

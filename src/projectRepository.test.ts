import { describe, expect, it } from "vitest";
import { PROJECT_SCHEMA_VERSION, type ProjectSnapshot } from "./projectDomain";
import { InMemoryProjectRepository } from "./projectRepository";

const createdAt = "2026-11-08T16:00:00.000Z";

function createSnapshot(revisionId = "revision-1", revisionNumber = 1): ProjectSnapshot {
  return {
    schemaVersion: PROJECT_SCHEMA_VERSION,
    project: { id: "project-1", title: "Projeto de ensaio" },
    revision: { id: revisionId, number: revisionNumber, createdAt },
    evidence: [],
    measurements: [],
    observations: [],
    pendingItems: [],
    physicalConstraints: [],
    furniture: [],
    specifications: [],
  };
}

function createRepository() {
  const repository = new InMemoryProjectRepository();
  repository.createProject({
    id: "project-1",
    title: "Projeto de ensaio",
    createdAt,
  });
  return repository;
}

describe("project revisions", () => {
  it("keeps saved snapshots immutable when the caller changes its draft", () => {
    const repository = createRepository();
    const snapshot = createSnapshot();
    repository.saveRevision(snapshot);
    snapshot.project.title = "Título alterado fora do repositório";

    expect(repository.listRevisions("project-1")[0]?.project.title).toBe(
      "Projeto de ensaio",
    );
  });

  it("restores a prior revision as a new revision without removing the source", () => {
    const repository = createRepository();
    repository.saveRevision(createSnapshot());

    const restored = repository.restoreRevision({
      projectId: "project-1",
      sourceRevisionId: "revision-1",
      newRevisionId: "revision-2",
      restoredAt: "2026-11-08T16:05:00.000Z",
    });

    expect(restored.revision).toMatchObject({
      id: "revision-2",
      number: 2,
      baseRevisionId: "revision-1",
    });
    expect(repository.listRevisions("project-1").map((item) => item.revision.id)).toEqual([
      "revision-1",
      "revision-2",
    ]);
  });

  it("preserves visit observations when creating a later revision", () => {
    const repository = createRepository();
    const first = createSnapshot();
    first.observations = [
      {
        id: "observation-1",
        text: "Suporte da pia visível.",
        attribution: {
          origin: "field",
          recordedBy: "responsavel-projeto",
          recordedAt: createdAt,
          confidence: "observed",
        },
        evidenceIds: [],
      },
    ];
    repository.saveRevision(first);
    repository.saveRevision({
      ...first,
      revision: { id: "revision-2", number: 2, createdAt: "2026-11-08T16:05:00.000Z" },
    });

    expect(repository.listRevisions("project-1")[1]?.observations[0]?.text).toBe(
      "Suporte da pia visível.",
    );
  });

  it("rejects skipped revision numbers and cross-project saves", () => {
    const repository = createRepository();

    expect(() => repository.saveRevision(createSnapshot("revision-2", 2))).toThrow(
      "A próxima revisão precisa ser R1.",
    );
    expect(() =>
      repository.saveRevision({
        ...createSnapshot(),
        project: { id: "other-project", title: "Outro" },
      }),
    ).toThrow("O projeto da revisão não existe.");
  });
});

import { describe, expect, it } from "vitest";
import { syncDraftQueueItem } from "./supabaseDraftSync";
import type { DraftSyncQueueItem } from "./draftSyncQueue";
import { PROJECT_SCHEMA_VERSION } from "./projectDomain";

const item: DraftSyncQueueItem = {
  id: "sync-project-1-revision-1",
  projectId: "project-1",
  revisionId: "revision-1",
  snapshot: {
    schemaVersion: PROJECT_SCHEMA_VERSION,
    project: { id: "project-1", title: "Projeto local" },
    revision: { id: "revision-1", number: 1, createdAt: "2026-11-09T10:00:00.000Z" },
    evidence: [], measurements: [], observations: [], pendingItems: [], physicalConstraints: [], furniture: [], specifications: [],
  },
  status: "pending",
  queuedAt: "2026-11-09T10:01:00.000Z",
  attempts: 0,
};

describe("Supabase draft synchronization", () => {
  it("blocks without an authenticated session before touching project data", async () => {
    const calls: string[] = [];
    const client = {
      auth: { getUser: async () => ({ data: { user: null }, error: new Error("no session") }) },
      from: () => { calls.push("from"); throw new Error("must not query tables"); },
    } as never;

    await expect(syncDraftQueueItem(client, item)).resolves.toEqual({
      status: "blocked",
      reason: "authentication-required",
      message: "Entre com uma conta autorizada antes de sincronizar o rascunho.",
    });
    expect(calls).toEqual([]);
  });
});

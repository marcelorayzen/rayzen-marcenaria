import { describe, expect, it } from "vitest";
import { syncDraftQueueItem } from "./supabaseDraftSync";
import type { DraftSyncQueueItem } from "./draftSyncQueue";
import { PROJECT_SCHEMA_VERSION } from "./projectDomain";
import { reverseKeys } from "./testSnapshots";

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

function createRetryableClient() {
  const projectIds = new Set<string>();
  const memberships = new Set<string>();
  const revisions = new Map<string, { id: string; model: unknown }>();
  let projectInserts = 0;
  let revisionInserts = 0;

  class Query {
    private operation: "select" | "insert" = "select";
    private payload: Record<string, unknown> = {};
    private filters = new Map<string, unknown>();

    constructor(private readonly table: string) {}
    select() { return this; }
    eq(column: string, value: unknown) { this.filters.set(column, value); return this; }
    insert(payload: Record<string, unknown>) { this.operation = "insert"; this.payload = payload; return this; }
    maybeSingle() { return Promise.resolve(this.resolve()); }
    single() { return Promise.resolve(this.resolve()); }
    then(resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) {
      return Promise.resolve(this.resolve()).then(resolve, reject);
    }

    private resolve() {
      if (this.table === "profiles") return { data: { id: "user-1" }, error: null };
      if (this.table === "projects" && this.operation === "select") {
        const id = String(this.filters.get("id"));
        return { data: projectIds.has(id) ? { id } : null, error: null };
      }
      if (this.table === "projects") {
        const id = String(this.payload.id);
        projectIds.add(id);
        projectInserts += 1;
        return { data: { id }, error: null };
      }
      if (this.table === "project_members") {
        const key = `${this.payload.project_id}:${this.payload.user_id}`;
        if (memberships.has(key)) return { data: null, error: { code: "23505" } };
        memberships.add(key);
        return { data: null, error: null };
      }
      if (this.table === "revisions" && this.operation === "select") {
        const key = `${this.filters.get("project_id")}:${this.filters.get("number")}`;
        return { data: revisions.get(key) ?? null, error: null };
      }
      if (this.table === "revisions") {
        const key = `${this.payload.project_id}:${this.payload.number}`;
        // Postgres jsonb does not keep key order; emulate it to catch false conflicts.
        const revision = { id: `remote-revision-${revisionInserts + 1}`, model: reverseKeys(this.payload.model) };
        revisions.set(key, revision);
        revisionInserts += 1;
        return { data: { id: revision.id }, error: null };
      }
      throw new Error(`Unexpected table ${this.table}`);
    }
  }

  return {
    client: {
      auth: { getUser: async () => ({ data: { user: { id: "user-1" } }, error: null }) },
      from: (table: string) => new Query(table),
    } as never,
    counts: () => ({ projectInserts, revisionInserts }),
  };
}

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

  it("reuses the reserved project and revision when the same item is retried", async () => {
    const fake = createRetryableClient();
    const boundItem = { ...item, remoteProjectId: "11111111-1111-4111-8111-111111111111" };
    const first = await syncDraftQueueItem(fake.client, boundItem);
    const second = await syncDraftQueueItem(fake.client, boundItem);
    expect(first).toEqual({
      status: "synced",
      remoteProjectId: boundItem.remoteProjectId,
      remoteRevisionId: "remote-revision-1",
    });
    expect(second).toEqual(first);
    expect(fake.counts()).toEqual({ projectInserts: 1, revisionInserts: 1 });
  });
});

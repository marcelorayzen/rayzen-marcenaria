import { describe, expect, it } from "vitest";
import { bindDraftRemoteProject, BrowserDraftSyncQueue, enqueueDraftSync, markDraftSyncConflict, markDraftSyncFailed, markDraftSyncing, markDraftSynced } from "./draftSyncQueue";
import { PROJECT_SCHEMA_VERSION, type ProjectSnapshot } from "./projectDomain";

const snapshot: ProjectSnapshot = {
  schemaVersion: PROJECT_SCHEMA_VERSION,
  project: { id: "project-1", title: "Projeto local" },
  revision: { id: "revision-1", number: 1, createdAt: "2026-11-09T10:00:00.000Z" },
  evidence: [], measurements: [], observations: [], pendingItems: [], physicalConstraints: [], furniture: [], specifications: [],
};

class MemoryStorage {
  private values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
  removeItem(key: string) { this.values.delete(key); }
}

describe("draft synchronization queue", () => {
  it("validates and deduplicates a revision", () => {
    const first = enqueueDraftSync([], snapshot, "2026-11-09T10:01:00.000Z");
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    const second = enqueueDraftSync(first.queue, snapshot, "2026-11-09T10:02:00.000Z");
    expect(second.ok && second.queue).toHaveLength(1);
  });

  it("tracks attempts and keeps failures explicit", () => {
    const queued = enqueueDraftSync([], snapshot, "2026-11-09T10:01:00.000Z");
    if (!queued.ok) throw new Error(queued.message);
    const syncing = markDraftSyncing(queued.queue, queued.queue[0].id);
    if (!syncing.ok) throw new Error(syncing.message);
    expect(syncing.queue[0].attempts).toBe(1);
    const failed = markDraftSyncFailed(syncing.queue, syncing.queue[0].id, "offline");
    expect(failed.ok && failed.queue[0].status).toBe("failed");
  });

  it("binds all revisions of a local project to one remote project", () => {
    const first = enqueueDraftSync([], snapshot, "2026-11-09T10:01:00.000Z");
    if (!first.ok) throw new Error(first.message);
    const bound = bindDraftRemoteProject(first.queue, first.queue[0].id, "remote-project-1");
    if (!bound.ok) throw new Error(bound.message);
    const revision2 = {
      ...snapshot,
      revision: { id: "revision-2", number: 2, createdAt: "2026-11-09T10:02:00.000Z" },
    };
    const second = enqueueDraftSync(bound.queue, revision2, "2026-11-09T10:03:00.000Z");
    expect(second.ok && second.queue[1].remoteProjectId).toBe("remote-project-1");
  });

  it("rejects changing an existing remote project binding", () => {
    const first = enqueueDraftSync([], snapshot, "2026-11-09T10:01:00.000Z");
    if (!first.ok) throw new Error(first.message);
    const bound = bindDraftRemoteProject(first.queue, first.queue[0].id, "remote-project-1");
    if (!bound.ok) throw new Error(bound.message);
    expect(bindDraftRemoteProject(bound.queue, bound.queue[0].id, "remote-project-2")).toEqual({
      ok: false,
      message: "O projeto local já possui outro vínculo remoto.",
    });
  });

  it("keeps conflict separate from successful synchronization", () => {
    const queued = enqueueDraftSync([], snapshot, "2026-11-09T10:01:00.000Z");
    if (!queued.ok) throw new Error(queued.message);
    const conflict = markDraftSyncConflict(queued.queue, queued.queue[0].id, "remote revision changed");
    expect(conflict.ok && conflict.queue[0].status).toBe("conflict");
    const synced = markDraftSynced(queued.queue, queued.queue[0].id, "remote-project", "remote-revision");
    expect(synced.ok && synced.queue[0].status).toBe("synced");
  });

  it("persists the queue through the browser adapter", () => {
    const storage = new MemoryStorage();
    const adapter = new BrowserDraftSyncQueue(storage, "sync");
    const queued = enqueueDraftSync([], snapshot, "2026-11-09T10:01:00.000Z");
    if (!queued.ok) throw new Error(queued.message);
    adapter.save(queued.queue);
    expect(new BrowserDraftSyncQueue(storage, "sync").load()).toEqual(queued.queue);
    adapter.clear();
    expect(adapter.load()).toEqual([]);
  });
});

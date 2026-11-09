import { describe, expect, it } from "vitest";
import { BrowserDraftSyncQueue, enqueueDraftSync, markDraftSyncConflict, markDraftSyncFailed, markDraftSyncing, markDraftSynced } from "./draftSyncQueue";
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

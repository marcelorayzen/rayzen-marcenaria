import { describe, expect, it } from "vitest";
import type { DraftSyncQueueItem } from "./draftSyncQueue";
import { mergeRemoteRevisions, replaceWithRemoteRevisions } from "./remoteRecoveryMerge";
import type { RemoteRevision } from "./supabaseProjectRecovery";
import { fixtureSnapshot, reverseKeys } from "./testSnapshots";

const REMOTE_PROJECT = "11111111-1111-4111-8111-111111111111";
const NOW = "2026-11-10T20:00:00.000Z";

function remote(...numbers: number[]): RemoteRevision[] {
  return numbers.map(number => ({ remoteRevisionId: `remote-${number}`, snapshot: reverseKeys(fixtureSnapshot(number)) }));
}

describe("remote recovery merge", () => {
  it("recovers the full history on a device without a local copy", () => {
    const result = mergeRemoteRevisions(REMOTE_PROJECT, remote(1, 2), [], [], NOW);
    expect(result.status).toBe("merged");
    if (result.status !== "merged") return;
    expect(result.snapshots.map(snapshot => snapshot.revision.number)).toEqual([1, 2]);
    expect(result.imported).toBe(2);
    expect(result.queue.every(item => item.status === "synced" && item.remoteProjectId === REMOTE_PROJECT)).toBe(true);
    expect(result.queue.map(item => item.remoteRevisionId)).toEqual(["remote-1", "remote-2"]);
  });

  it("appends remote revisions and keeps local-only revisions after identical ones", () => {
    const withRemoteR2 = mergeRemoteRevisions(REMOTE_PROJECT, remote(1, 2), [fixtureSnapshot(1)], [], NOW);
    expect(withRemoteR2).toMatchObject({ status: "merged", imported: 1, localOnly: 0 });

    const withLocalR2 = mergeRemoteRevisions(REMOTE_PROJECT, remote(1), [fixtureSnapshot(1), fixtureSnapshot(2)], [], NOW);
    expect(withLocalR2).toMatchObject({ status: "merged", imported: 0, localOnly: 1 });
    if (withLocalR2.status === "merged") expect(withLocalR2.snapshots).toHaveLength(2);
  });

  it("stops on a diverging revision instead of overwriting the local copy", () => {
    const local = [fixtureSnapshot(1, 950)];
    const result = mergeRemoteRevisions(REMOTE_PROJECT, remote(1), local, [], NOW);
    expect(result.status).toBe("conflict");
    expect(local[0]!.furniture[0]!.parameters.width).toBe(950);
  });

  it("allows an explicit replacement only through the dedicated function", () => {
    const result = replaceWithRemoteRevisions(REMOTE_PROJECT, remote(1), NOW);
    expect(result).toMatchObject({ status: "merged", imported: 1 });
  });

  it("refuses a local project already bound to another remote project", () => {
    const queue: DraftSyncQueueItem[] = [{
      id: "sync-project-local-1-revision-1", projectId: "project-local-1", revisionId: "revision-1",
      snapshot: fixtureSnapshot(1), status: "synced", queuedAt: NOW, attempts: 1,
      remoteProjectId: "22222222-2222-4222-8222-222222222222", remoteRevisionId: "other",
    }];
    expect(mergeRemoteRevisions(REMOTE_PROJECT, remote(1), [fixtureSnapshot(1)], queue, NOW).status).toBe("conflict");
  });

  it("does not keep a false synced state for a revision missing remotely", () => {
    const queue: DraftSyncQueueItem[] = [{
      id: "sync-project-local-1-revision-2", projectId: "project-local-1", revisionId: "revision-2",
      snapshot: fixtureSnapshot(2), status: "synced", queuedAt: NOW, attempts: 1,
      remoteProjectId: REMOTE_PROJECT, remoteRevisionId: "vanished",
    }];
    const result = mergeRemoteRevisions(REMOTE_PROJECT, remote(1), [fixtureSnapshot(1), fixtureSnapshot(2)], queue, NOW);
    expect(result.status).toBe("merged");
    if (result.status !== "merged") return;
    expect(result.queue.find(item => item.revisionId === "revision-2")).toMatchObject({ status: "failed", remoteRevisionId: undefined });
  });

  it("refuses a non-contiguous remote history", () => {
    expect(mergeRemoteRevisions(REMOTE_PROJECT, remote(1, 3), [], [], NOW).status).toBe("failed");
  });
});

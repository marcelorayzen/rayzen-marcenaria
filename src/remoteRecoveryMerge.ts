import { sameCanonicalJson } from "./canonicalJson";
import type { DraftSyncQueueItem } from "./draftSyncQueue";
import type { ProjectSnapshot } from "./projectDomain";
import type { RemoteRevision } from "./supabaseProjectRecovery";

export type RecoveryMergeResult =
  | {
      status: "merged";
      localProjectId: string;
      title: string;
      snapshots: ProjectSnapshot[];
      queue: DraftSyncQueueItem[];
      imported: number;
      localOnly: number;
    }
  | { status: "conflict"; localProjectId: string; message: string }
  | { status: "failed"; message: string };

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

/**
 * Merges remote revisions into the local copy of the same project without
 * silent overwrite. Rules:
 * - remote numbers must be contiguous from R1;
 * - a revision present on both sides must have identical content, otherwise
 *   the merge stops as a conflict and the local copy is untouched;
 * - remote revisions beyond the local history are appended;
 * - local revisions beyond the remote history are kept as not yet synced.
 * The returned queue marks every remote revision as synced, so later local
 * revisions keep using the same remote project.
 */
export function mergeRemoteRevisions(
  remoteProjectId: string,
  remote: RemoteRevision[],
  local: ProjectSnapshot[],
  localQueue: DraftSyncQueueItem[],
  recoveredAt: string,
): RecoveryMergeResult {
  if (!remoteProjectId.trim()) return { status: "failed", message: "O projeto remoto é obrigatório." };
  if (remote.length === 0) return { status: "failed", message: "O projeto remoto ainda não possui revisões para recuperar." };
  if (Number.isNaN(Date.parse(recoveredAt))) return { status: "failed", message: "A data de recuperação é inválida." };

  const localProjectId = remote[0]!.snapshot.project.id;
  for (const [index, revision] of remote.entries()) {
    if (revision.snapshot.revision.number !== index + 1) {
      return { status: "failed", message: `O histórico remoto não é contínuo: esperado R${index + 1}.` };
    }
    if (revision.snapshot.project.id !== localProjectId) {
      return { status: "failed", message: "As revisões remotas apontam para projetos locais diferentes." };
    }
  }
  if (local.some(snapshot => snapshot.project.id !== localProjectId)) {
    return { status: "failed", message: "A cópia local informada pertence a outro projeto." };
  }
  const boundElsewhere = localQueue.find(item => item.remoteProjectId && item.remoteProjectId !== remoteProjectId);
  if (boundElsewhere) {
    return {
      status: "conflict",
      localProjectId,
      message: "Este projeto local já está vinculado a outro projeto remoto; nada foi alterado.",
    };
  }

  const snapshots: ProjectSnapshot[] = [];
  for (const [index, revision] of remote.entries()) {
    const localRevision = local[index];
    if (localRevision && !sameCanonicalJson(localRevision, revision.snapshot)) {
      return {
        status: "conflict",
        localProjectId,
        message: `A revisão R${index + 1} local difere da remota; nada foi alterado. Baixe um backup local antes de decidir substituir.`,
      };
    }
    snapshots.push(clone(revision.snapshot));
  }
  const localOnly = local.slice(remote.length).map(clone);
  snapshots.push(...localOnly);

  const remoteRevisionIds = new Set(remote.map(revision => revision.snapshot.revision.id));
  const queue: DraftSyncQueueItem[] = remote.map(revision => {
    const previous = localQueue.find(item => item.revisionId === revision.snapshot.revision.id);
    return {
      id: `sync-${localProjectId}-${revision.snapshot.revision.id}`,
      projectId: localProjectId,
      revisionId: revision.snapshot.revision.id,
      snapshot: clone(revision.snapshot),
      status: "synced",
      queuedAt: previous?.queuedAt ?? recoveredAt,
      attempts: previous?.attempts ?? 0,
      remoteProjectId,
      remoteRevisionId: revision.remoteRevisionId,
    };
  });
  for (const item of localQueue) {
    if (remoteRevisionIds.has(item.revisionId)) continue;
    const kept: DraftSyncQueueItem = { ...clone(item), remoteProjectId };
    if (kept.status === "synced") {
      // The remote listing does not contain it: never keep a false "synced".
      kept.status = "failed";
      kept.remoteRevisionId = undefined;
      kept.lastError = "A revisão não foi encontrada no projeto remoto durante a recuperação; sincronize novamente.";
    }
    queue.push(kept);
  }

  const latest = snapshots.at(-1)!;
  return {
    status: "merged",
    localProjectId,
    title: latest.project.title,
    snapshots,
    queue,
    imported: Math.max(0, remote.length - local.length),
    localOnly: localOnly.length,
  };
}

/**
 * Explicit replacement chosen by the user after a conflict: the local copy
 * becomes exactly the remote history. Callers must confirm and offer a
 * backup first; this function never runs implicitly.
 */
export function replaceWithRemoteRevisions(
  remoteProjectId: string,
  remote: RemoteRevision[],
  recoveredAt: string,
): RecoveryMergeResult {
  return mergeRemoteRevisions(remoteProjectId, remote, [], [], recoveredAt);
}

import { type ProjectSnapshot, validateProjectSnapshot } from "./projectDomain";

export type DraftSyncQueueStatus =
  | "pending"
  | "syncing"
  | "synced"
  | "failed"
  | "conflict";

export interface DraftSyncQueueItem {
  id: string;
  projectId: string;
  revisionId: string;
  snapshot: ProjectSnapshot;
  status: DraftSyncQueueStatus;
  queuedAt: string;
  attempts: number;
  lastError?: string;
  remoteProjectId?: string;
  remoteRevisionId?: string;
}

export interface DraftSyncQueueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export type QueueResult =
  | { ok: true; queue: DraftSyncQueueItem[] }
  | { ok: false; message: string };

function cloneSnapshot(snapshot: ProjectSnapshot): ProjectSnapshot {
  return JSON.parse(JSON.stringify(snapshot)) as ProjectSnapshot;
}

function cloneItem(item: DraftSyncQueueItem): DraftSyncQueueItem {
  return { ...item, snapshot: cloneSnapshot(item.snapshot) };
}

export function enqueueDraftSync(
  queue: DraftSyncQueueItem[],
  snapshot: ProjectSnapshot,
  queuedAt: string,
): QueueResult {
  const issues = validateProjectSnapshot(snapshot);
  if (issues.length > 0) {
    return { ok: false, message: `Snapshot inválido para sincronização: ${issues[0]}` };
  }
  if (Number.isNaN(Date.parse(queuedAt))) {
    return { ok: false, message: "A data de enfileiramento é inválida." };
  }

  const existing = queue.find(
    (item) => item.projectId === snapshot.project.id && item.revisionId === snapshot.revision.id,
  );
  if (existing !== undefined) return { ok: true, queue: queue.map(cloneItem) };

  const item: DraftSyncQueueItem = {
    id: `sync-${snapshot.project.id}-${snapshot.revision.id}`,
    projectId: snapshot.project.id,
    revisionId: snapshot.revision.id,
    snapshot: cloneSnapshot(snapshot),
    status: "pending",
    queuedAt,
    attempts: 0,
  };
  return { ok: true, queue: [...queue.map(cloneItem), item] };
}

export function markDraftSyncing(queue: DraftSyncQueueItem[], id: string): QueueResult {
  const item = queue.find((candidate) => candidate.id === id);
  if (!item) return { ok: false, message: "Item de sincronização não encontrado." };
  if (item.status === "synced") return { ok: false, message: "Uma revisão sincronizada não pode voltar à fila." };
  return {
    ok: true,
    queue: queue.map((candidate) =>
      candidate.id === id
        ? { ...cloneItem(candidate), status: "syncing", attempts: candidate.attempts + 1 }
        : cloneItem(candidate),
    ),
  };
}

export function markDraftSynced(
  queue: DraftSyncQueueItem[],
  id: string,
  remoteProjectId: string,
  remoteRevisionId: string,
): QueueResult {
  if (!remoteProjectId.trim() || !remoteRevisionId.trim()) {
    return { ok: false, message: "A sincronização precisa identificar projeto e revisão remotos." };
  }
  const item = queue.find((candidate) => candidate.id === id);
  if (!item) return { ok: false, message: "Item de sincronização não encontrado." };
  return {
    ok: true,
    queue: queue.map((candidate) =>
      candidate.id === id
        ? {
            ...cloneItem(candidate),
            status: "synced",
            lastError: undefined,
            remoteProjectId,
            remoteRevisionId,
          }
        : cloneItem(candidate),
    ),
  };
}

export function markDraftSyncFailed(
  queue: DraftSyncQueueItem[],
  id: string,
  message: string,
): QueueResult {
  if (!message.trim()) return { ok: false, message: "A falha de sincronização precisa de uma mensagem." };
  const item = queue.find((candidate) => candidate.id === id);
  if (!item) return { ok: false, message: "Item de sincronização não encontrado." };
  return {
    ok: true,
    queue: queue.map((candidate) =>
      candidate.id === id ? { ...cloneItem(candidate), status: "failed", lastError: message.trim() } : cloneItem(candidate),
    ),
  };
}

export function markDraftSyncConflict(
  queue: DraftSyncQueueItem[],
  id: string,
  message: string,
): QueueResult {
  if (!message.trim()) return { ok: false, message: "O conflito precisa de uma mensagem explicativa." };
  const item = queue.find((candidate) => candidate.id === id);
  if (!item) return { ok: false, message: "Item de sincronização não encontrado." };
  return {
    ok: true,
    queue: queue.map((candidate) =>
      candidate.id === id ? { ...cloneItem(candidate), status: "conflict", lastError: message.trim() } : cloneItem(candidate),
    ),
  };
}

export class BrowserDraftSyncQueue {
  constructor(
    private readonly storage: DraftSyncQueueStorage,
    private readonly key: string,
  ) {}

  load(): DraftSyncQueueItem[] {
    const raw = this.storage.getItem(this.key);
    if (!raw) return [];
    try {
      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed as DraftSyncQueueItem[];
    } catch {
      return [];
    }
  }

  save(queue: DraftSyncQueueItem[]): void {
    this.storage.setItem(this.key, JSON.stringify(queue));
  }

  clear(): void {
    this.storage.removeItem(this.key);
  }
}

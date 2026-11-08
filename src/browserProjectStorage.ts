import type { ProjectSnapshot } from "./projectDomain";

export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/**
 * Browser-only persistence for local drafts. It is deliberately a small
 * adapter: synchronization and authenticated remote storage remain separate.
 */
export class BrowserProjectStorage {
  constructor(
    private readonly storage: KeyValueStorage,
    private readonly key: string,
  ) {}

  load(): ProjectSnapshot[] {
    const raw = this.storage.getItem(this.key);
    if (raw === null) return [];

    try {
      const parsed: unknown = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as ProjectSnapshot[]) : [];
    } catch {
      return [];
    }
  }

  save(snapshots: ProjectSnapshot[]): void {
    this.storage.setItem(this.key, JSON.stringify(snapshots));
  }

  clear(): void {
    this.storage.removeItem(this.key);
  }
}

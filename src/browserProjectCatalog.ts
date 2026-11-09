import type { KeyValueStorage } from "./browserProjectStorage";

export interface LocalProjectSummary {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

function validDate(value: string): boolean {
  return !Number.isNaN(Date.parse(value));
}

function isSummary(value: unknown): value is LocalProjectSummary {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return typeof item.id === "string" && item.id.trim().length > 0
    && typeof item.title === "string" && item.title.trim().length > 0
    && typeof item.createdAt === "string" && validDate(item.createdAt)
    && typeof item.updatedAt === "string" && validDate(item.updatedAt);
}

export class BrowserProjectCatalog {
  constructor(
    private readonly storage: KeyValueStorage,
    private readonly key: string,
  ) {}

  load(): LocalProjectSummary[] {
    const raw = this.storage.getItem(this.key);
    if (!raw) return [];
    try {
      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      const byId = new Map<string, LocalProjectSummary>();
      for (const item of parsed) {
        if (isSummary(item)) byId.set(item.id, { ...item });
      }
      return [...byId.values()].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
    } catch {
      return [];
    }
  }

  upsert(project: LocalProjectSummary): LocalProjectSummary[] {
    if (!isSummary(project)) throw new Error("Projeto local inválido para o catálogo.");
    const next = [project, ...this.load().filter(item => item.id !== project.id)]
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
    this.storage.setItem(this.key, JSON.stringify(next));
    return next.map(item => ({ ...item }));
  }
}

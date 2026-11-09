import { describe, expect, it } from "vitest";
import { BrowserProjectCatalog } from "./browserProjectCatalog";
import type { KeyValueStorage } from "./browserProjectStorage";

class MemoryStorage implements KeyValueStorage {
  private readonly values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  removeItem(key: string) { this.values.delete(key); }
  setItem(key: string, value: string) { this.values.set(key, value); }
}

describe("browser project catalog", () => {
  it("keeps separate projects and updates one without deleting another", () => {
    const catalog = new BrowserProjectCatalog(new MemoryStorage(), "projects");
    catalog.upsert({ id: "a", title: "A", createdAt: "2026-11-09T10:00:00Z", updatedAt: "2026-11-09T10:00:00Z" });
    catalog.upsert({ id: "b", title: "B", createdAt: "2026-11-09T11:00:00Z", updatedAt: "2026-11-09T11:00:00Z" });
    const result = catalog.upsert({ id: "a", title: "A atualizado", createdAt: "2026-11-09T10:00:00Z", updatedAt: "2026-11-09T12:00:00Z" });
    expect(result.map(item => [item.id, item.title])).toEqual([["a", "A atualizado"], ["b", "B"]]);
  });

  it("filters malformed and duplicate entries when loading", () => {
    const storage = new MemoryStorage();
    storage.setItem("projects", JSON.stringify([
      { id: "a", title: "Antigo", createdAt: "2026-11-09T10:00:00Z", updatedAt: "2026-11-09T10:00:00Z" },
      { id: "a", title: "Novo", createdAt: "2026-11-09T10:00:00Z", updatedAt: "2026-11-09T11:00:00Z" },
      { id: "", title: "Inválido", createdAt: "x", updatedAt: "x" },
    ]));
    expect(new BrowserProjectCatalog(storage, "projects").load()).toEqual([
      { id: "a", title: "Novo", createdAt: "2026-11-09T10:00:00Z", updatedAt: "2026-11-09T11:00:00Z" },
    ]);
  });

  it("returns an empty catalog for corrupted JSON", () => {
    const storage = new MemoryStorage();
    storage.setItem("projects", "not-json");
    expect(new BrowserProjectCatalog(storage, "projects").load()).toEqual([]);
  });
});

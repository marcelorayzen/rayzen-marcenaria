import { describe, expect, it } from "vitest";
import { BrowserProjectStorage, type KeyValueStorage } from "./browserProjectStorage";
import { PROJECT_SCHEMA_VERSION, type ProjectSnapshot } from "./projectDomain";

class MemoryStorage implements KeyValueStorage {
  private readonly values = new Map<string, string>();

  getItem(key: string) { return this.values.get(key) ?? null; }
  removeItem(key: string) { this.values.delete(key); }
  setItem(key: string, value: string) { this.values.set(key, value); }
}

const snapshot: ProjectSnapshot = {
  schemaVersion: PROJECT_SCHEMA_VERSION,
  project: { id: "project-1", title: "Projeto local" },
  revision: { id: "revision-1", number: 1, createdAt: "2026-11-08T17:00:00.000Z" },
  evidence: [],
  measurements: [],
  observations: [],
  pendingItems: [],
  physicalConstraints: [],
  furniture: [],
  specifications: [],
};

describe("browser project storage", () => {
  it("keeps local snapshots across a new storage adapter instance", () => {
    const storage = new MemoryStorage();
    new BrowserProjectStorage(storage, "demo").save([snapshot]);

    expect(new BrowserProjectStorage(storage, "demo").load()).toEqual([snapshot]);
  });

  it("returns an empty draft list for corrupted local data and can clear it", () => {
    const storage = new MemoryStorage();
    storage.setItem("demo", "not-json");
    const adapter = new BrowserProjectStorage(storage, "demo");

    expect(adapter.load()).toEqual([]);
    adapter.clear();
    expect(storage.getItem("demo")).toBeNull();
  });
});

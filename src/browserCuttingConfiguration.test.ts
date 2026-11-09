import { describe, expect, it } from "vitest";
import { BrowserCuttingConfiguration } from "./browserCuttingConfiguration";
import type { KeyValueStorage } from "./browserProjectStorage";

class MemoryStorage implements KeyValueStorage {
  private readonly values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  removeItem(key: string) { this.values.delete(key); }
  setItem(key: string, value: string) { this.values.set(key, value); }
}

describe("browser cutting configuration", () => {
  it("persists grain and exact trim independently for each project key", () => {
    const storage = new MemoryStorage();
    const first = new BrowserCuttingConfiguration(storage, "cutting:a");
    const second = new BrowserCuttingConfiguration(storage, "cutting:b");
    first.save({ version: 1, grain: "length", trim: { topMm: 3, rightMm: 4, bottomMm: 3, leftMm: 4 }, preferredStrategy: "area" });
    second.save({ version: 1, grain: "none", trim: { topMm: 4, rightMm: 4, bottomMm: 4, leftMm: 4 } });
    expect(first.load()?.trim).toEqual({ topMm: 3, rightMm: 4, bottomMm: 3, leftMm: 4 });
    expect(first.load()?.preferredStrategy).toBe("area");
    expect(second.load()?.grain).toBe("none");
  });

  it("keeps pending values and rejects malformed stored data", () => {
    const storage = new MemoryStorage();
    const adapter = new BrowserCuttingConfiguration(storage, "cutting");
    adapter.save({ version: 1, grain: "pending", trim: { topMm: null, rightMm: 4, bottomMm: null, leftMm: 3 } });
    expect(adapter.load()?.trim.topMm).toBeNull();
    storage.setItem("cutting", JSON.stringify({ version: 1, grain: "none", trim: { topMm: -1 } }));
    expect(adapter.load()).toBeNull();
  });
});

import { describe, expect, it } from "vitest";
import { BrowserCuttingPlanArchive } from "./browserCuttingPlanArchive";
import type { KeyValueStorage } from "./browserProjectStorage";
import type { CuttingPlanPackage } from "./cuttingPlanExport";

class MemoryStorage implements KeyValueStorage {
  private readonly values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  removeItem(key: string) { this.values.delete(key); }
  setItem(key: string, value: string) { this.values.set(key, value); }
}

const cuttingPackage = {
  format: "rayzen-preliminary-cutting-package",
  formatVersion: 1,
  project: { id: "project-1", title: "Cozinha" },
  revision: 2,
  status: "preliminary-not-released",
  report: {
    format: "rayzen-preliminary-cutting-report",
    revision: 2,
    project: { id: "project-1", title: "Cozinha" },
  },
  labels: [],
} as unknown as CuttingPlanPackage;

describe("browser cutting plan archive", () => {
  it("keeps immutable plan records ordered without replacing other revisions", () => {
    const archive = new BrowserCuttingPlanArchive(new MemoryStorage(), "plans");
    archive.save({
      id: "plan-r1",
      savedAt: "2026-11-09T10:00:00Z",
      package: { ...cuttingPackage, revision: 1, report: { ...cuttingPackage.report, revision: 1 } },
    });
    const result = archive.save({ id: "plan-r2", savedAt: "2026-11-09T11:00:00Z", package: cuttingPackage });
    expect(result.map(item => item.id)).toEqual(["plan-r2", "plan-r1"]);
    expect(result.map(item => item.package.revision)).toEqual([2, 1]);
  });

  it("filters malformed records instead of loading them as plans", () => {
    const storage = new MemoryStorage();
    storage.setItem("plans", JSON.stringify([{ id: "bad", savedAt: "no", package: {} }]));
    expect(new BrowserCuttingPlanArchive(storage, "plans").load()).toEqual([]);
  });
});

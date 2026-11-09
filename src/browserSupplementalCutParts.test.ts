import { describe, expect, it } from "vitest";
import type { KeyValueStorage } from "./browserProjectStorage";
import {
  BrowserSupplementalCutParts,
  validateSupplementalCutParts,
  type SupplementalCutPart,
} from "./browserSupplementalCutParts";

class MemoryStorage implements KeyValueStorage {
  private readonly values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  removeItem(key: string) { this.values.delete(key); }
  setItem(key: string, value: string) { this.values.set(key, value); }
}

const layer: SupplementalCutPart = {
  id: "door-front-15",
  code: "PT-01-A",
  name: "Porta - camada frontal",
  material: "MDF branco",
  thickness: 15,
  length: 700,
  width: 400,
  quantity: 2,
  edges: "Fita 22 mm após composição",
  grain: "none",
  sourceReference: "Medição da porta PT-01",
};

describe("supplemental cut parts browser storage", () => {
  it("persists a validated revision-specific list without sharing project keys", () => {
    const storage = new MemoryStorage();
    const first = new BrowserSupplementalCutParts(storage, "project-a:r1");
    const second = new BrowserSupplementalCutParts(storage, "project-a:r2");
    first.save([layer]);
    expect(first.load()).toEqual([layer]);
    expect(second.load()).toEqual([]);
  });

  it("rejects missing provenance, invalid dimensions and duplicate IDs", () => {
    const result = validateSupplementalCutParts([
      { ...layer, sourceReference: "", thickness: 0 },
      { ...layer },
    ]);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors).toContain("Peça complementar 1: informe sourceReference.");
    expect(result.errors).toContain("Peça complementar 1: thickness deve ser positivo.");
    expect(result.errors).toContain("Peça complementar 2 precisa de ID único.");
  });

  it("ignores malformed stored JSON instead of promoting it to cutting input", () => {
    const storage = new MemoryStorage();
    storage.setItem("parts", "{bad");
    expect(new BrowserSupplementalCutParts(storage, "parts").load()).toEqual([]);
  });
});

import { describe, expect, it } from "vitest";
import type { KeyValueStorage } from "./browserProjectStorage";
import {
  BrowserSupplementalCutParts,
  calculatedSupplementalSource,
  createSupplementalDoor15x6,
  manualSupplementalSource,
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
  it("creates truthful automatic provenance for manual and copied inputs", () => {
    expect(manualSupplementalSource(3)).toBe("Entrada manual registrada na revisão R03");
    expect(calculatedSupplementalSource(" PT-01 ", 3)).toBe("Derivada da peça calculada PT-01 na revisão R03");
  });

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
    expect(result.errors).toContain("Peça complementar 1: informe a origem.");
    expect(result.errors).toContain("Peça complementar 1: a espessura deve ser positiva.");
    expect(result.errors).toContain("Peça complementar 2 precisa de ID único.");
  });

  it("keeps a 15 + 6 composition paired with equal dimensions", () => {
    const front: SupplementalCutPart = {
      ...layer,
      id: "door-front",
      thickness: 15,
      composite: { id: "door-composite", kind: "door-15-6", layer: "front-15", bandedSides: ["top", "left"] },
    };
    const back: SupplementalCutPart = {
      ...layer,
      id: "door-back",
      code: "PT-01-6",
      thickness: 6,
      composite: { id: "door-composite", kind: "door-15-6", layer: "back-6", bandedSides: ["top", "left"] },
    };
    expect(validateSupplementalCutParts([front, back]).ok).toBe(true);
    const invalid = validateSupplementalCutParts([front, { ...back, width: 399 }]);
    expect(invalid.ok).toBe(false);
    if (invalid.ok) return;
    expect(invalid.errors).toContain("Composição door-composite: as duas camadas devem ter medidas, quantidade e veio iguais.");
  });

  it("generates both equal-size cutting layers from one door input", () => {
    const result = createSupplementalDoor15x6({
      compositeId: "door-composite",
      frontId: "front-id",
      backId: "back-id",
      revisionId: "R03",
      sourceReference: "Projeto da porta PT-01",
      code: "PT-01",
      name: "Porta da pia",
      quantity: 2,
      lengthMm: 1000,
      widthMm: 500,
      frontMaterialId: "MDF branco 15",
      backMaterialId: "MDF branco 6",
      grain: "none",
      bandedSides: ["top", "left", "right"],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.parts.map(part => [part.code, part.thickness, part.length, part.width])).toEqual([
      ["PT-01-15", 15, 1000, 500],
      ["PT-01-6", 6, 1000, 500],
    ]);
    expect(result.parts.every(part => part.quantity === 2 && part.edges.includes("Fita 22 mm"))).toBe(true);
  });

  it("ignores malformed stored JSON instead of promoting it to cutting input", () => {
    const storage = new MemoryStorage();
    storage.setItem("parts", "{bad");
    expect(new BrowserSupplementalCutParts(storage, "parts").load()).toEqual([]);
  });
});

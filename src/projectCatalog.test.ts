import { describe, expect, it } from "vitest";
import { validateProjectCatalog, validateProjectCatalogItem, type ProjectCatalogItem } from "./projectCatalog";

const item: ProjectCatalogItem = {
  id: "catalog-door-1", code: "PORTA-CAVA-J", name: "Porta com cava J", kind: "door",
  manufacturer: null, specifications: { profile: "J oculto" }, sourceReference: "Regra interna da oficina", active: true,
};

describe("project catalog contract", () => {
  it("accepts an explicitly sourced catalog item without inventing dimensions", () => {
    expect(validateProjectCatalogItem(item)).toEqual([]);
  });

  it("rejects duplicated IDs/codes and empty specifications", () => {
    expect(validateProjectCatalog([item, { ...item }, { ...item, id: "catalog-hardware", code: "FERR-1", specifications: { width: "" } }])).toEqual(expect.arrayContaining([
      "Item 2: ID duplicado.", "Item 2: codigo duplicado.", "Item 3: As especificacoes do catalogo nao podem ter chave ou valor vazio.",
    ]));
  });
});

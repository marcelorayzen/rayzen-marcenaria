export type CatalogItemKind = "door" | "drawer" | "hardware" | "equipment";

export interface ProjectCatalogItem {
  id: string;
  code: string;
  name: string;
  kind: CatalogItemKind;
  manufacturer: string | null;
  specifications: Record<string, string>;
  sourceReference: string;
  active: boolean;
}

export type CatalogSpecificationsParseResult =
  | { ok: true; specifications: Record<string, string> }
  | { ok: false; error: string };

export function parseCatalogSpecifications(input: string): CatalogSpecificationsParseResult {
  const specifications: Record<string, string> = {};
  for (const [index, rawLine] of input.split(/\r?\n/).entries()) {
    const line = rawLine.trim();
    if (!line) continue;
    const separator = line.indexOf("=");
    if (separator <= 0 || separator === line.length - 1) {
      return { ok: false, error: `Especificação ${index + 1}: use o formato chave=valor.` };
    }
    const key = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim();
    if (!key || !value || specifications[key] !== undefined) {
      return { ok: false, error: `Especificação ${index + 1}: chave vazia ou repetida.` };
    }
    specifications[key] = value;
  }
  return { ok: true, specifications };
}

export function validateProjectCatalogItem(item: ProjectCatalogItem): string[] {
  const errors: string[] = [];
  if (!item.id.trim() || !item.code.trim() || !item.name.trim()) errors.push("Identifique item, codigo e nome do catalogo.");
  if (!( ["door", "drawer", "hardware", "equipment"] as string[]).includes(item.kind)) errors.push("Tipo de item do catalogo invalido.");
  if (!item.sourceReference.trim()) errors.push("Informe a origem da especificacao do catalogo.");
  for (const [key, value] of Object.entries(item.specifications)) {
    if (!key.trim() || !value.trim()) errors.push("As especificacoes do catalogo nao podem ter chave ou valor vazio.");
  }
  return errors;
}

export function validateProjectCatalog(items: ProjectCatalogItem[]): string[] {
  const errors: string[] = [];
  const ids = new Set<string>();
  const codes = new Set<string>();
  items.forEach((item, index) => {
    if (ids.has(item.id)) errors.push(`Item ${index + 1}: ID duplicado.`);
    if (codes.has(item.code)) errors.push(`Item ${index + 1}: codigo duplicado.`);
    ids.add(item.id); codes.add(item.code);
    errors.push(...validateProjectCatalogItem(item).map(error => `Item ${index + 1}: ${error}`));
  });
  return errors;
}
import type { KeyValueStorage } from "./browserProjectStorage";


export class BrowserProjectCatalogItems {
  constructor(private readonly storage: KeyValueStorage, private readonly key: string) {}
  load(): ProjectCatalogItem[] {
    const raw = this.storage.getItem(this.key);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw) as unknown;
      return Array.isArray(parsed) && validateProjectCatalog(parsed as ProjectCatalogItem[]).length === 0 ? parsed as ProjectCatalogItem[] : [];
    } catch { return []; }
  }
  save(items: ProjectCatalogItem[]): ProjectCatalogItem[] {
    const errors = validateProjectCatalog(items);
    if (errors.length) throw new Error(errors.join(" "));
    this.storage.setItem(this.key, JSON.stringify(items));
    return items;
  }
}

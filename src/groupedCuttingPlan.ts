import {
  comparePreliminaryStripPlans,
  type CuttingPlanComparison,
  type CuttingSettings,
  type RectangularCutPart,
  type SheetStock,
} from "./cuttingPlan";

export interface CuttingMaterialGroup {
  id: string;
  materialId: string;
  thicknessMm: number;
  stock: SheetStock;
  parts: RectangularCutPart[];
  comparison: Extract<CuttingPlanComparison, { ok: true }>;
}

export type GroupedCuttingPlanResult =
  | { ok: true; groups: CuttingMaterialGroup[] }
  | { ok: false; errors: string[]; pending: string[] };

function groupId(materialId: string, thicknessMm: number): string {
  return JSON.stringify([materialId, thicknessMm]);
}

/** Separates stock groups before planning so materials never share a sheet. */
export function createGroupedCuttingPlans(
  stockTemplate: Omit<SheetStock, "id" | "materialId" | "thicknessMm">,
  settings: CuttingSettings,
  parts: RectangularCutPart[],
): GroupedCuttingPlanResult {
  if (parts.length === 0) return { ok: false, errors: ["Informe ao menos uma peça para agrupar."], pending: [] };
  const partIds = new Set<string>();
  const duplicateIds = new Set<string>();
  for (const part of parts) {
    if (partIds.has(part.id)) duplicateIds.add(part.id);
    partIds.add(part.id);
  }
  if (duplicateIds.size > 0) {
    return {
      ok: false,
      errors: [...duplicateIds].sort().map(id => `ID de peça repetido entre grupos: ${id}.`),
      pending: [],
    };
  }
  const grouped = new Map<string, RectangularCutPart[]>();
  for (const part of parts) {
    const key = groupId(part.materialId, part.thicknessMm);
    grouped.set(key, [...(grouped.get(key) ?? []), part]);
  }

  const errors: string[] = [];
  const pending: string[] = [];
  const groups: CuttingMaterialGroup[] = [];
  const entries = [...grouped.entries()].sort(([left], [right]) => left.localeCompare(right));
  for (const [id, groupParts] of entries) {
    const first = groupParts[0];
    const stock: SheetStock = {
      ...stockTemplate,
      id: `stock-${id}`,
      materialId: first.materialId,
      thicknessMm: first.thicknessMm,
    };
    const comparison = comparePreliminaryStripPlans(stock, settings, groupParts);
    if (!comparison.ok) {
      errors.push(...comparison.plan.errors.map(message => `${first.materialId} ${first.thicknessMm} mm: ${message}`));
      pending.push(...comparison.plan.pending.map(message => `${first.materialId} ${first.thicknessMm} mm: ${message}`));
      continue;
    }
    groups.push({
      id,
      materialId: first.materialId,
      thicknessMm: first.thicknessMm,
      stock,
      parts: groupParts.map(part => ({ ...part })),
      comparison,
    });
  }
  return errors.length || pending.length ? { ok: false, errors, pending } : { ok: true, groups };
}

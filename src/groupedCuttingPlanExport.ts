import type { CuttingPieceLabel } from "./cuttingLabels";
import type { CuttingPlanPackage } from "./cuttingPlanExport";

export interface GroupedCuttingPlanPackage {
  format: "rayzen-preliminary-grouped-cutting-package";
  formatVersion: 1;
  project: CuttingPlanPackage["project"];
  revision: number;
  status: "preliminary-not-released";
  groups: CuttingPlanPackage[];
  labels: CuttingPieceLabel[];
}

export type GroupedCuttingPlanPackageResult =
  | { ok: true; package: GroupedCuttingPlanPackage }
  | { ok: false; message: string };

export function createGroupedCuttingPlanPackage(
  groups: CuttingPlanPackage[],
): GroupedCuttingPlanPackageResult {
  if (groups.length === 0) return { ok: false, message: "Informe ao menos um grupo de corte." };
  const first = groups[0];
  if (groups.some(group =>
    group.project.id !== first.project.id || group.revision !== first.revision,
  )) {
    return { ok: false, message: "Todos os grupos precisam pertencer ao mesmo projeto e revisão." };
  }
  const stockGroups = new Set<string>();
  for (const group of groups) {
    const stock = group.report.stock;
    const key = JSON.stringify([stock.materialId, stock.thicknessMm]);
    if (stockGroups.has(key)) {
      return { ok: false, message: "Material e espessura não podem aparecer em grupos duplicados." };
    }
    stockGroups.add(key);
  }
  const labels = groups.flatMap(group => group.labels.map(label => ({ ...label })));
  return {
    ok: true,
    package: {
      format: "rayzen-preliminary-grouped-cutting-package",
      formatVersion: 1,
      project: { ...first.project },
      revision: first.revision,
      status: "preliminary-not-released",
      groups: JSON.parse(JSON.stringify(groups)) as CuttingPlanPackage[],
      labels,
    },
  };
}

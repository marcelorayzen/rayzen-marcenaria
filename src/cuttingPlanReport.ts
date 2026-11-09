import type {
  CuttingSettings,
  CuttingPlanStrategy,
  PlannedSheet,
  PreliminaryCutPlan,
  RectangularCutPart,
  SheetStock,
} from "./cuttingPlan";

export interface CuttingPlanReport {
  format: "rayzen-preliminary-cutting-report";
  formatVersion: 1;
  project: { id: string; title: string };
  revision: number;
  status: "preliminary-not-released";
  strategy: CuttingPlanStrategy;
  stock: SheetStock;
  settings: CuttingSettings;
  parts: RectangularCutPart[];
  sheets: PlannedSheet[];
  warning: string;
}

export type CuttingPlanReportResult =
  | { ok: true; report: CuttingPlanReport }
  | { ok: false; message: string };

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

/**
 * Creates the immutable projection used by print/export. It accepts only a
 * successfully calculated plan and keeps project/revision traceability.
 */
export function createCuttingPlanReport(
  project: { id: string; title: string },
  revision: number,
  stock: SheetStock,
  settings: CuttingSettings,
  parts: RectangularCutPart[],
  plan: PreliminaryCutPlan,
): CuttingPlanReportResult {
  if (!project.id.trim() || !project.title.trim()) {
    return { ok: false, message: "O relatório precisa identificar o projeto." };
  }
  if (!Number.isSafeInteger(revision) || revision <= 0) {
    return { ok: false, message: "O relatório precisa identificar uma revisão válida." };
  }
  if (!plan.ok) {
    return { ok: false, message: "Conclua a configuração antes de gerar o relatório." };
  }

  const plannedCounts = new Map<string, number>();
  for (const sheet of plan.sheets) {
    for (const placement of sheet.placements) {
      plannedCounts.set(placement.partId, (plannedCounts.get(placement.partId) ?? 0) + 1);
    }
  }
  const mismatch = parts.find(part => plannedCounts.get(part.id) !== part.quantity);
  if (mismatch) {
    return { ok: false, message: `A quantidade planejada da peça ${mismatch.id} não confere.` };
  }

  return {
    ok: true,
    report: {
      format: "rayzen-preliminary-cutting-report",
      formatVersion: 1,
      project: { id: project.id, title: project.title },
      revision,
      status: "preliminary-not-released",
      strategy: plan.strategy,
      stock: clone(stock),
      settings: clone(settings),
      parts: clone(parts),
      sheets: clone(plan.sheets),
      warning: "Documento preliminar para conferência; não liberado para fabricação.",
    },
  };
}

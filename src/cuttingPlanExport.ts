import type { CuttingPieceLabel } from "./cuttingLabels";
import type { CuttingPlanReport } from "./cuttingPlanReport";

export interface CuttingPlanPackage {
  format: "rayzen-preliminary-cutting-package";
  formatVersion: 1;
  project: CuttingPlanReport["project"];
  revision: number;
  status: "preliminary-not-released";
  report: CuttingPlanReport;
  labels: CuttingPieceLabel[];
}

export type CuttingPlanPackageResult =
  | { ok: true; package: CuttingPlanPackage }
  | { ok: false; message: string };

function csvCell(value: string | number): string {
  const text = String(value);
  return /[;"\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function createCuttingPlanPackage(
  report: CuttingPlanReport,
  labels: CuttingPieceLabel[],
): CuttingPlanPackageResult {
  const placementCount = report.sheets.reduce((sum, sheet) => sum + sheet.placements.length, 0);
  if (labels.length !== placementCount) {
    return { ok: false, message: "A quantidade de etiquetas não confere com as peças posicionadas." };
  }
  const mismatched = labels.some(label =>
    label.projectId !== report.project.id || label.revision !== report.revision,
  );
  if (mismatched) {
    return { ok: false, message: "Relatório e etiquetas pertencem a projetos ou revisões diferentes." };
  }
  return {
    ok: true,
    package: {
      format: "rayzen-preliminary-cutting-package",
      formatVersion: 1,
      project: { ...report.project },
      revision: report.revision,
      status: "preliminary-not-released",
      report: JSON.parse(JSON.stringify(report)) as CuttingPlanReport,
      labels: JSON.parse(JSON.stringify(labels)) as CuttingPieceLabel[],
    },
  };
}

export function createCuttingLabelsCsv(labels: CuttingPieceLabel[]): string {
  const header = [
    "projeto_id", "projeto", "revisao", "chapa", "codigo", "peca", "instancia",
    "comprimento_mm", "largura_mm", "espessura_mm", "material", "bordas", "origem", "catalogo_item_id", "operacoes", "girada_no_plano", "status",
  ];
  const rows = labels.map(label => [
    label.projectId,
    label.projectTitle,
    label.revision,
    label.sheetNumber,
    label.partCode,
    label.partName,
    label.instance,
    label.lengthMm,
    label.widthMm,
    label.thicknessMm,
    label.material,
    label.edges,
    label.sourceReference ?? "",
    label.catalogItemId ?? "",
    label.productionOperations?.map(operation =>
      `${operation.status === "pending" ? "PENDENTE" : "DEFINIDA"}: ${operation.description}`,
    ).join(" | ") ?? "",
    label.rotatedInPlan ? "sim" : "nao",
    label.status,
  ].map(csvCell).join(";"));
  return [header.join(";"), ...rows].join("\r\n");
}

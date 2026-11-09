import type { CuttingSettings, PlannedSheet, SheetStock } from "./cuttingPlan";

export interface CuttingMapDimensionLine {
  id: string;
  axis: "horizontal" | "vertical";
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  label: string;
  scope: "stock" | "usable" | "part";
}

export interface CuttingMapAnnotations {
  usableArea: { x: number; y: number; width: number; height: number };
  dimensions: CuttingMapDimensionLine[];
}

export type CuttingMapAnnotationsResult =
  | { ok: true; annotations: CuttingMapAnnotations }
  | { ok: false; message: string };

export function createCuttingMapAnnotations(
  stock: SheetStock,
  settings: CuttingSettings,
  sheet: PlannedSheet,
): CuttingMapAnnotationsResult {
  if (Object.values(settings.trim).some(value => value === null)) {
    return { ok: false, message: "Os quatro refilos são necessários para cotar o mapa." };
  }
  const usableArea = {
    x: settings.trim.leftMm!,
    y: settings.trim.topMm!,
    width: stock.lengthMm - settings.trim.leftMm! - settings.trim.rightMm!,
    height: stock.widthMm - settings.trim.topMm! - settings.trim.bottomMm!,
  };
  if (usableArea.width <= 0 || usableArea.height <= 0) {
    return { ok: false, message: "A área útil da chapa é inválida para cotagem." };
  }
  const dimensions: CuttingMapDimensionLine[] = [
    { id: "stock-length", axis: "horizontal", x1: 0, y1: 28, x2: stock.lengthMm, y2: 28, label: `${stock.lengthMm} mm`, scope: "stock" },
    { id: "stock-width", axis: "vertical", x1: 28, y1: 0, x2: 28, y2: stock.widthMm, label: `${stock.widthMm} mm`, scope: "stock" },
    { id: "usable-length", axis: "horizontal", x1: usableArea.x, y1: usableArea.y + 72, x2: usableArea.x + usableArea.width, y2: usableArea.y + 72, label: `útil ${usableArea.width} mm`, scope: "usable" },
    { id: "usable-width", axis: "vertical", x1: usableArea.x + 72, y1: usableArea.y, x2: usableArea.x + 72, y2: usableArea.y + usableArea.height, label: `útil ${usableArea.height} mm`, scope: "usable" },
  ];
  for (const placement of sheet.placements) {
    dimensions.push(
      {
        id: `${placement.id}-length`, axis: "horizontal",
        x1: placement.xMm, y1: placement.yMm + Math.min(34, placement.widthMm / 3),
        x2: placement.xMm + placement.lengthMm, y2: placement.yMm + Math.min(34, placement.widthMm / 3),
        label: `${placement.lengthMm}`, scope: "part",
      },
      {
        id: `${placement.id}-width`, axis: "vertical",
        x1: placement.xMm + Math.min(34, placement.lengthMm / 3), y1: placement.yMm,
        x2: placement.xMm + Math.min(34, placement.lengthMm / 3), y2: placement.yMm + placement.widthMm,
        label: `${placement.widthMm}`, scope: "part",
      },
    );
  }
  return { ok: true, annotations: { usableArea, dimensions } };
}

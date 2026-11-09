export interface SheetTrim {
  topMm: number | null;
  rightMm: number | null;
  bottomMm: number | null;
  leftMm: number | null;
}

export interface SheetStock {
  id: string;
  materialId: string | null;
  thicknessMm: number | null;
  lengthMm: number;
  widthMm: number;
  grain: "length" | "width" | "none" | "pending";
}

export interface CuttingSettings {
  kerfMm: number;
  trim: SheetTrim;
}

export interface RectangularCutPart {
  id: string;
  materialId: string;
  thicknessMm: number;
  lengthMm: number;
  widthMm: number;
  quantity: number;
  grain: "length" | "width" | "none" | "pending";
  allowRotation: boolean;
}

export interface CuttingConfigurationCheck {
  errors: string[];
  pending: string[];
  usableLengthMm: number | null;
  usableWidthMm: number | null;
}

function finitePositive(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}

function finiteNonNegative(value: number): boolean {
  return Number.isFinite(value) && value >= 0;
}

/**
 * Validates the inputs needed by a future optimizer. Unknown trim values block
 * calculation instead of silently becoming zero.
 */
export function validateCuttingConfiguration(
  sheet: SheetStock,
  settings: CuttingSettings,
  parts: RectangularCutPart[],
): CuttingConfigurationCheck {
  const errors: string[] = [];
  const pending: string[] = [];
  if (!sheet.id.trim()) errors.push("Identifique a chapa.");
  if (sheet.materialId === null || !sheet.materialId.trim()) pending.push("Definir material da chapa.");
  if (sheet.thicknessMm === null) pending.push("Definir espessura da chapa.");
  else if (!finitePositive(sheet.thicknessMm)) errors.push("Espessura da chapa deve ser positiva e finita.");
  if (![sheet.lengthMm, sheet.widthMm].every(finitePositive)) errors.push("Dimensões da chapa devem ser positivas e finitas.");
  if (sheet.grain === "pending") pending.push("Definir sentido do veio da chapa.");
  if (!finitePositive(settings.kerfMm)) {
    errors.push("A largura de corte deve ser positiva e finita.");
  }

  const trimEntries = Object.entries(settings.trim) as Array<[keyof SheetTrim, number | null]>;
  for (const [side, value] of trimEntries) {
    if (value === null) pending.push(`Definir refilo ${side}.`);
    else if (!finiteNonNegative(value)) errors.push(`Refilo ${side} inválido.`);
  }

  const knownTrim = trimEntries.every(([, value]) => value !== null);
  const usableLengthMm = knownTrim
    ? sheet.lengthMm - settings.trim.leftMm! - settings.trim.rightMm!
    : null;
  const usableWidthMm = knownTrim
    ? sheet.widthMm - settings.trim.topMm! - settings.trim.bottomMm!
    : null;
  if (usableLengthMm !== null && usableLengthMm <= 0) errors.push("Refilos eliminam o comprimento útil da chapa.");
  if (usableWidthMm !== null && usableWidthMm <= 0) errors.push("Refilos eliminam a largura útil da chapa.");

  const ids = new Set<string>();
  for (const part of parts) {
    if (!part.id.trim() || ids.has(part.id)) errors.push("Peças precisam de IDs únicos.");
    ids.add(part.id);
    if (!part.materialId.trim()) errors.push(`Informe o material da peça ${part.id || "sem ID"}.`);
    if (![part.thicknessMm, part.lengthMm, part.widthMm].every(finitePositive)) {
      errors.push(`Dimensões da peça ${part.id || "sem ID"} são inválidas.`);
    }
    if (!Number.isSafeInteger(part.quantity) || part.quantity <= 0) {
      errors.push(`Quantidade da peça ${part.id || "sem ID"} deve ser inteira e positiva.`);
    }
    if (part.grain === "pending") pending.push(`Definir veio da peça ${part.id}.`);
    if ((sheet.materialId !== null && part.materialId !== sheet.materialId)
      || (sheet.thicknessMm !== null && part.thicknessMm !== sheet.thicknessMm)) {
      errors.push(`Peça ${part.id} não pertence ao material e espessura desta chapa.`);
    }
    if (usableLengthMm !== null && usableWidthMm !== null && part.grain !== "pending") {
      const directFits = part.lengthMm <= usableLengthMm && part.widthMm <= usableWidthMm;
      const rotatedFits = part.allowRotation
        && part.grain === "none"
        && part.widthMm <= usableLengthMm
        && part.lengthMm <= usableWidthMm;
      if (!directFits && !rotatedFits) errors.push(`Peça ${part.id} não cabe na área útil da chapa.`);
    }
  }

  return { errors, pending, usableLengthMm, usableWidthMm };
}

export const reportedWorkshopSheet: SheetStock = {
  id: "workshop-sheet-2750x1850",
  materialId: null,
  thicknessMm: null,
  lengthMm: 2750,
  widthMm: 1850,
  grain: "pending",
};

export const reportedWorkshopCuttingSettings: CuttingSettings = {
  kerfMm: 3,
  trim: { topMm: null, rightMm: null, bottomMm: null, leftMm: null },
};

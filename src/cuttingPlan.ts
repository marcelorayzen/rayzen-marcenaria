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

export interface CutPlacement {
  id: string;
  partId: string;
  instance: number;
  xMm: number;
  yMm: number;
  lengthMm: number;
  widthMm: number;
  rotated: boolean;
  strip: number;
}

export interface PlannedSheet {
  number: number;
  placements: CutPlacement[];
  usedPartAreaMm2: number;
  usableAreaMm2: number;
}

export type PreliminaryCutPlan =
  | { ok: false; errors: string[]; pending: string[] }
  | { ok: true; sheets: PlannedSheet[]; kerfMm: number; note: string };

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

interface ExpandedPart extends RectangularCutPart {
  instance: number;
}

interface StripState {
  yMm: number;
  widthMm: number;
  nextXMm: number;
}

interface SheetState {
  placements: CutPlacement[];
  strips: StripState[];
}

function orientations(part: ExpandedPart): Array<{ lengthMm: number; widthMm: number; rotated: boolean }> {
  const values = [{ lengthMm: part.lengthMm, widthMm: part.widthMm, rotated: false }];
  if (part.allowRotation && part.grain === "none" && part.lengthMm !== part.widthMm) {
    values.push({ lengthMm: part.widthMm, widthMm: part.lengthMm, rotated: true });
  }
  return values;
}

/**
 * Deterministic strip layout used as a reviewable baseline. It is not yet a
 * production cut sequence or a claim of optimal material use.
 */
export function createPreliminaryStripPlan(
  sheet: SheetStock,
  settings: CuttingSettings,
  parts: RectangularCutPart[],
): PreliminaryCutPlan {
  const check = validateCuttingConfiguration(sheet, settings, parts);
  if (check.errors.length || check.pending.length || check.usableLengthMm === null || check.usableWidthMm === null) {
    return { ok: false, errors: check.errors, pending: check.pending };
  }

  const expanded: ExpandedPart[] = parts.flatMap(part =>
    Array.from({ length: part.quantity }, (_, index) => ({ ...part, instance: index + 1 })),
  ).sort((left, right) =>
    Math.max(right.lengthMm, right.widthMm) - Math.max(left.lengthMm, left.widthMm)
      || right.widthMm - left.widthMm
      || left.id.localeCompare(right.id)
      || left.instance - right.instance,
  );
  const sheetStates: SheetState[] = [];
  const originX = settings.trim.leftMm!;
  const originY = settings.trim.topMm!;
  const endX = sheet.lengthMm - settings.trim.rightMm!;
  const endY = sheet.widthMm - settings.trim.bottomMm!;

  const place = (
    state: SheetState,
    stripIndex: number,
    strip: StripState,
    part: ExpandedPart,
    orientation: { lengthMm: number; widthMm: number; rotated: boolean },
  ) => {
    state.placements.push({
      id: JSON.stringify([part.id, part.instance]),
      partId: part.id,
      instance: part.instance,
      xMm: strip.nextXMm,
      yMm: strip.yMm,
      lengthMm: orientation.lengthMm,
      widthMm: orientation.widthMm,
      rotated: orientation.rotated,
      strip: stripIndex + 1,
    });
    strip.nextXMm += orientation.lengthMm + settings.kerfMm;
  };

  for (const part of expanded) {
    let placed = false;
    for (const state of sheetStates) {
      for (const [stripIndex, strip] of state.strips.entries()) {
        const option = orientations(part).find(candidate =>
          candidate.widthMm <= strip.widthMm && strip.nextXMm + candidate.lengthMm <= endX,
        );
        if (option) {
          place(state, stripIndex, strip, part, option);
          placed = true;
          break;
        }
      }
      if (placed) break;

      const nextY = state.strips.length === 0
        ? originY
        : state.strips.at(-1)!.yMm + state.strips.at(-1)!.widthMm + settings.kerfMm;
      const option = orientations(part).find(candidate =>
        originX + candidate.lengthMm <= endX && nextY + candidate.widthMm <= endY,
      );
      if (option) {
        const strip = { yMm: nextY, widthMm: option.widthMm, nextXMm: originX };
        state.strips.push(strip);
        place(state, state.strips.length - 1, strip, part, option);
        placed = true;
        break;
      }
    }

    if (!placed) {
      const option = orientations(part).find(candidate =>
        originX + candidate.lengthMm <= endX && originY + candidate.widthMm <= endY,
      );
      if (!option) {
        return { ok: false, errors: [`Peça ${part.id} não cabe na chapa.`], pending: [] };
      }
      const state: SheetState = { placements: [], strips: [] };
      const strip = { yMm: originY, widthMm: option.widthMm, nextXMm: originX };
      state.strips.push(strip);
      place(state, 0, strip, part, option);
      sheetStates.push(state);
    }
  }

  const usableAreaMm2 = check.usableLengthMm * check.usableWidthMm;
  return {
    ok: true,
    kerfMm: settings.kerfMm,
    note: "Distribuição preliminar em faixas; sequência de cortes e liberação técnica ainda pendentes.",
    sheets: sheetStates.map((state, index) => ({
      number: index + 1,
      placements: state.placements,
      usedPartAreaMm2: state.placements.reduce((sum, item) => sum + item.lengthMm * item.widthMm, 0),
      usableAreaMm2,
    })),
  };
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

/** Reported usual trim range. Each production plan still records exact values per side. */
export const reportedWorkshopTrimRangeMm = { min: 3, max: 4 } as const;

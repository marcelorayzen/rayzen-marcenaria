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
  sourceReference?: string;
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
  operations: PreliminaryCutOperation[];
  usedPartAreaMm2: number;
  usableAreaMm2: number;
}

interface PreliminaryCutOperationBase {
  sequence: number;
  label: string;
}

export type PreliminaryCutOperation = PreliminaryCutOperationBase & (
  | {
      kind: "reference-clean-edges";
      axis: null;
      positionMm: null;
      spanMm: null;
    }
  | {
      kind: "trim" | "rip-strip" | "crosscut-part";
      axis: "length" | "width";
      positionMm: number;
      spanMm: number;
    }
);

type UnsequencedCutOperation =
  | {
      kind: "reference-clean-edges";
      axis: null;
      positionMm: null;
      spanMm: null;
      label: string;
    }
  | {
      kind: "trim" | "rip-strip" | "crosscut-part";
      axis: "length" | "width";
      positionMm: number;
      spanMm: number;
      label: string;
    };

type UnsequencedTrimOperation = {
  kind: "trim";
  axis: "length" | "width";
  positionMm: number;
  spanMm: number;
  amountMm: number;
  label: string;
};

export type CuttingPlanStrategy = "largest-side" | "area" | "strip-width";

export interface CuttingPlanAlternativeSummary {
  strategy: CuttingPlanStrategy;
  sheetCount: number;
  operationCount: number;
  usedPartAreaMm2: number;
  wasteAreaMm2: number;
  selected: boolean;
}

export type CuttingPlanComparison =
  | { ok: false; plan: Extract<PreliminaryCutPlan, { ok: false }> }
  | {
      ok: true;
      selectedPlan: Extract<PreliminaryCutPlan, { ok: true }>;
      alternatives: CuttingPlanAlternativeSummary[];
    };

export function validatePreliminaryPlanGeometry(
  sheet: SheetStock,
  settings: CuttingSettings,
  sheets: PlannedSheet[],
): string[] {
  const trimValues = Object.values(settings.trim);
  if (trimValues.some(value => value === null)) {
    return ["Não é possível auditar o plano sem os quatro refilos."];
  }
  const issues: string[] = [];
  const left = settings.trim.leftMm!;
  const top = settings.trim.topMm!;
  const right = sheet.lengthMm - settings.trim.rightMm!;
  const bottom = sheet.widthMm - settings.trim.bottomMm!;
  const placementIds = new Set<string>();

  for (const plannedSheet of sheets) {
    for (const placement of plannedSheet.placements) {
      if (placementIds.has(placement.id)) issues.push(`Posicionamento repetido: ${placement.id}.`);
      placementIds.add(placement.id);
      if (placement.xMm < left || placement.yMm < top
        || placement.xMm + placement.lengthMm > right
        || placement.yMm + placement.widthMm > bottom) {
        issues.push(`Peça ${placement.partId} #${placement.instance} está fora da área útil da chapa ${plannedSheet.number}.`);
      }
    }
    for (let firstIndex = 0; firstIndex < plannedSheet.placements.length; firstIndex += 1) {
      const first = plannedSheet.placements[firstIndex];
      for (let secondIndex = firstIndex + 1; secondIndex < plannedSheet.placements.length; secondIndex += 1) {
        const second = plannedSheet.placements[secondIndex];
        const separatedOnX = first.xMm + first.lengthMm + settings.kerfMm <= second.xMm
          || second.xMm + second.lengthMm + settings.kerfMm <= first.xMm;
        const separatedOnY = first.yMm + first.widthMm + settings.kerfMm <= second.yMm
          || second.yMm + second.widthMm + settings.kerfMm <= first.yMm;
        if (!separatedOnX && !separatedOnY) {
          issues.push(`Peças ${first.partId} #${first.instance} e ${second.partId} #${second.instance} se sobrepõem ou não preservam a serra na chapa ${plannedSheet.number}.`);
        }
      }
    }
    const calculatedArea = plannedSheet.placements.reduce(
      (sum, placement) => sum + placement.lengthMm * placement.widthMm,
      0,
    );
    if (calculatedArea !== plannedSheet.usedPartAreaMm2) {
      issues.push(`Área utilizada divergente na chapa ${plannedSheet.number}.`);
    }
    if (plannedSheet.operations.some((operation, index) => operation.sequence !== index + 1)) {
      issues.push(`Sequência de operações inválida na chapa ${plannedSheet.number}.`);
    }
  }
  return issues;
}

export type PreliminaryCutPlan =
  | { ok: false; errors: string[]; pending: string[] }
  | { ok: true; sheets: PlannedSheet[]; kerfMm: number; strategy: CuttingPlanStrategy; note: string };

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

function createPreliminaryOperations(
  sheet: SheetStock,
  settings: CuttingSettings,
  state: SheetState,
): PreliminaryCutOperation[] {
  const operations: UnsequencedCutOperation[] = [];
  const trims: UnsequencedTrimOperation[] = [
    { kind: "trim", axis: "length", positionMm: settings.trim.leftMm!, spanMm: sheet.widthMm, amountMm: settings.trim.leftMm!, label: "Refilar lado esquerdo" },
    { kind: "trim", axis: "length", positionMm: sheet.lengthMm - settings.trim.rightMm!, spanMm: sheet.widthMm, amountMm: settings.trim.rightMm!, label: "Refilar lado direito" },
    { kind: "trim", axis: "width", positionMm: settings.trim.topMm!, spanMm: sheet.lengthMm, amountMm: settings.trim.topMm!, label: "Refilar lado superior" },
    { kind: "trim", axis: "width", positionMm: sheet.widthMm - settings.trim.bottomMm!, spanMm: sheet.lengthMm, amountMm: settings.trim.bottomMm!, label: "Refilar lado inferior" },
  ];
  const appliedTrims = trims.filter(item => item.amountMm > 0);
  operations.push(...appliedTrims.map(({ amountMm: _amountMm, ...item }) => item));
  if (appliedTrims.length > 0) {
    operations.push({
      kind: "reference-clean-edges",
      axis: null,
      positionMm: null,
      spanMm: null,
      label: "Usar bordas refiladas como referência zero; não refilar cada peça",
    });
  }

  for (const [stripIndex, strip] of state.strips.entries()) {
    operations.push({
      kind: "rip-strip",
      axis: "width",
      positionMm: strip.yMm + strip.widthMm,
      spanMm: sheet.lengthMm - settings.trim.leftMm! - settings.trim.rightMm!,
      label: `Separar faixa ${stripIndex + 1} com ${strip.widthMm} mm`,
    });
    const placements = state.placements
      .filter(item => item.strip === stripIndex + 1)
      .sort((left, right) => left.xMm - right.xMm);
    for (const placement of placements) {
      operations.push({
        kind: "crosscut-part",
        axis: "length",
        positionMm: placement.xMm + placement.lengthMm,
        spanMm: strip.widthMm,
        label: `Cortar ${placement.partId} #${placement.instance} com ${placement.lengthMm} × ${placement.widthMm} mm`,
      });
    }
  }
  return operations.map((operation, index) => ({ ...operation, sequence: index + 1 }));
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
  strategy: CuttingPlanStrategy = "largest-side",
): PreliminaryCutPlan {
  const check = validateCuttingConfiguration(sheet, settings, parts);
  if (check.errors.length || check.pending.length || check.usableLengthMm === null || check.usableWidthMm === null) {
    return { ok: false, errors: check.errors, pending: check.pending };
  }

  const expanded: ExpandedPart[] = parts.flatMap(part =>
    Array.from({ length: part.quantity }, (_, index) => ({ ...part, instance: index + 1 })),
  ).sort((left, right) => {
    const strategyOrder = strategy === "area"
      ? right.lengthMm * right.widthMm - left.lengthMm * left.widthMm
      : strategy === "strip-width"
        ? right.widthMm - left.widthMm || right.lengthMm - left.lengthMm
        : Math.max(right.lengthMm, right.widthMm) - Math.max(left.lengthMm, left.widthMm)
          || right.widthMm - left.widthMm;
    return strategyOrder || left.id.localeCompare(right.id) || left.instance - right.instance;
  });
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
  const plannedSheets = sheetStates.map((state, index) => ({
      number: index + 1,
      placements: state.placements,
      operations: createPreliminaryOperations(sheet, settings, state),
      usedPartAreaMm2: state.placements.reduce((sum, item) => sum + item.lengthMm * item.widthMm, 0),
      usableAreaMm2,
    }));
  const auditIssues = validatePreliminaryPlanGeometry(sheet, settings, plannedSheets);
  if (auditIssues.length > 0) return { ok: false, errors: auditIssues, pending: [] };
  return {
    ok: true,
    kerfMm: settings.kerfMm,
    strategy,
    note: "Distribuição preliminar em faixas; sequência de cortes e liberação técnica ainda pendentes.",
    sheets: plannedSheets,
  };
}

export function comparePreliminaryStripPlans(
  sheet: SheetStock,
  settings: CuttingSettings,
  parts: RectangularCutPart[],
): CuttingPlanComparison {
  const strategies: CuttingPlanStrategy[] = ["largest-side", "area", "strip-width"];
  const plans = strategies.map(strategy => createPreliminaryStripPlan(sheet, settings, parts, strategy));
  const successful = plans.filter((plan): plan is Extract<PreliminaryCutPlan, { ok: true }> => plan.ok);
  if (successful.length === 0) {
    return { ok: false, plan: plans[0] as Extract<PreliminaryCutPlan, { ok: false }> };
  }
  const ranked = successful.map(plan => {
    const usedPartAreaMm2 = plan.sheets.reduce((sum, plannedSheet) => sum + plannedSheet.usedPartAreaMm2, 0);
    const totalUsableAreaMm2 = plan.sheets.reduce((sum, plannedSheet) => sum + plannedSheet.usableAreaMm2, 0);
    return {
      plan,
      sheetCount: plan.sheets.length,
      operationCount: plan.sheets.reduce((sum, plannedSheet) => sum + plannedSheet.operations.length, 0),
      usedPartAreaMm2,
      wasteAreaMm2: totalUsableAreaMm2 - usedPartAreaMm2,
    };
  }).sort((left, right) =>
    left.sheetCount - right.sheetCount
      || left.wasteAreaMm2 - right.wasteAreaMm2
      || left.operationCount - right.operationCount
      || strategies.indexOf(left.plan.strategy) - strategies.indexOf(right.plan.strategy),
  );
  const selected = ranked[0];
  return {
    ok: true,
    selectedPlan: selected.plan,
    alternatives: ranked.map(item => ({
      strategy: item.plan.strategy,
      sheetCount: item.sheetCount,
      operationCount: item.operationCount,
      usedPartAreaMm2: item.usedPartAreaMm2,
      wasteAreaMm2: item.wasteAreaMm2,
      selected: item.plan.strategy === selected.plan.strategy,
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

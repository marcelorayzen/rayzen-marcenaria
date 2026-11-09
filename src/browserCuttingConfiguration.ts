import type { KeyValueStorage } from "./browserProjectStorage";
import type { CuttingPlanStrategy, SheetTrim } from "./cuttingPlan";

export type CuttingGrain = "length" | "width" | "none" | "pending";

export interface LocalCuttingConfiguration {
  version: 1;
  grain: CuttingGrain;
  trim: SheetTrim;
  preferredStrategy?: CuttingPlanStrategy | null;
}

function validTrim(value: unknown): value is number | null {
  return value === null || (typeof value === "number" && Number.isFinite(value) && value >= 0);
}

function isConfiguration(value: unknown): value is LocalCuttingConfiguration {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  const trim = item.trim as Record<string, unknown> | undefined;
  return item.version === 1
    && ["length", "width", "none", "pending"].includes(String(item.grain))
    && !!trim
    && validTrim(trim.topMm)
    && validTrim(trim.rightMm)
    && validTrim(trim.bottomMm)
    && validTrim(trim.leftMm)
    && (item.preferredStrategy === undefined
      || item.preferredStrategy === null
      || ["largest-side", "area", "strip-width"].includes(String(item.preferredStrategy)));
}

export class BrowserCuttingConfiguration {
  constructor(
    private readonly storage: KeyValueStorage,
    private readonly key: string,
  ) {}

  load(): LocalCuttingConfiguration | null {
    const raw = this.storage.getItem(this.key);
    if (!raw) return null;
    try {
      const parsed: unknown = JSON.parse(raw);
      return isConfiguration(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }

  save(configuration: LocalCuttingConfiguration): void {
    if (!isConfiguration(configuration)) {
      throw new Error("Configuração local de corte inválida.");
    }
    this.storage.setItem(this.key, JSON.stringify(configuration));
  }
}

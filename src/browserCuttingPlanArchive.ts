import type { KeyValueStorage } from "./browserProjectStorage";
import type { CuttingPlanPackage } from "./cuttingPlanExport";
import type { GroupedCuttingPlanPackage } from "./groupedCuttingPlanExport";

export interface ArchivedCuttingPlan {
  id: string;
  savedAt: string;
  package: CuttingPlanPackage | GroupedCuttingPlanPackage;
}

function hasProjectRevision(value: Record<string, unknown>): boolean {
  const project = value.project as Record<string, unknown> | undefined;
  return typeof value.revision === "number"
    && Number.isSafeInteger(value.revision)
    && value.revision > 0
    && !!project
    && typeof project.id === "string"
    && project.id.length > 0;
}

function isSinglePackage(value: unknown): value is CuttingPlanPackage {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  const project = item.project as Record<string, unknown> | undefined;
  const report = item.report as Record<string, unknown> | undefined;
  const reportProject = report?.project as Record<string, unknown> | undefined;
  return item.format === "rayzen-preliminary-cutting-package"
    && item.formatVersion === 1
    && item.status === "preliminary-not-released"
    && hasProjectRevision(item)
    && !!project
    && Array.isArray(item.labels)
    && !!report
    && report.format === "rayzen-preliminary-cutting-report"
    && report.revision === item.revision
    && reportProject?.id === project.id;
}

function isGroupedPackage(value: unknown): value is GroupedCuttingPlanPackage {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return item.format === "rayzen-preliminary-grouped-cutting-package"
    && item.formatVersion === 1
    && item.status === "preliminary-not-released"
    && hasProjectRevision(item)
    && Array.isArray(item.groups)
    && item.groups.length > 0
    && item.groups.every(isSinglePackage)
    && Array.isArray(item.labels);
}

function isPackage(value: unknown): value is CuttingPlanPackage | GroupedCuttingPlanPackage {
  return isSinglePackage(value) || isGroupedPackage(value);
}

function isArchived(value: unknown): value is ArchivedCuttingPlan {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return typeof item.id === "string" && item.id.length > 0
    && typeof item.savedAt === "string" && !Number.isNaN(Date.parse(item.savedAt))
    && isPackage(item.package);
}

export class BrowserCuttingPlanArchive {
  constructor(
    private readonly storage: KeyValueStorage,
    private readonly key: string,
  ) {}

  load(): ArchivedCuttingPlan[] {
    const raw = this.storage.getItem(this.key);
    if (!raw) return [];
    try {
      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.filter(isArchived).sort((left, right) => right.savedAt.localeCompare(left.savedAt));
    } catch {
      return [];
    }
  }

  save(item: ArchivedCuttingPlan): ArchivedCuttingPlan[] {
    if (!isArchived(item)) throw new Error("Plano arquivado inválido.");
    const next = [item, ...this.load().filter(candidate => candidate.id !== item.id)]
      .sort((left, right) => right.savedAt.localeCompare(left.savedAt));
    this.storage.setItem(this.key, JSON.stringify(next));
    return next;
  }
}

import type { KeyValueStorage } from "./browserProjectStorage";
import type { CuttingPlanPackage } from "./cuttingPlanExport";

export interface ArchivedCuttingPlan {
  id: string;
  savedAt: string;
  package: CuttingPlanPackage;
}

function isPackage(value: unknown): value is CuttingPlanPackage {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  const project = item.project as Record<string, unknown> | undefined;
  const report = item.report as Record<string, unknown> | undefined;
  const reportProject = report?.project as Record<string, unknown> | undefined;
  return item.format === "rayzen-preliminary-cutting-package"
    && item.formatVersion === 1
    && item.status === "preliminary-not-released"
    && typeof item.revision === "number"
    && Number.isSafeInteger(item.revision)
    && item.revision > 0
    && !!project
    && typeof project.id === "string"
    && project.id.length > 0
    && Array.isArray(item.labels)
    && !!report
    && report.format === "rayzen-preliminary-cutting-report"
    && report.revision === item.revision
    && reportProject?.id === project.id;
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

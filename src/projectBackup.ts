import { type ProjectSnapshot, validateProjectSnapshot } from "./projectDomain";
import { validateProjectCatalog, type ProjectCatalogItem } from "./projectCatalog";

export interface LocalProjectBackup {
  format: "rayzen-marcenaria-local-backup";
  exportedAt: string;
  snapshots: ProjectSnapshot[];
  catalogItems?: ProjectCatalogItem[];
}

export type BackupValidation =
  | { ok: true; backup: LocalProjectBackup }
  | { ok: false; message: string };

/** Validates exported local data without writing to browser storage. */
export function validateLocalProjectBackup(raw: string): BackupValidation {
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return { ok: false, message: "O arquivo não contém JSON válido." };
  }
  if (!isBackup(value)) {
    return { ok: false, message: "O arquivo não é um backup local reconhecido." };
  }
  if (Number.isNaN(Date.parse(value.exportedAt)) || value.snapshots.length === 0) {
    return { ok: false, message: "O backup não tem data válida ou revisões." };
  }
  const projectId = value.snapshots[0]?.project.id;
  for (const [index, snapshot] of value.snapshots.entries()) {
    if (snapshot.project.id !== projectId || snapshot.revision.number !== index + 1) {
      return { ok: false, message: "As revisões do backup não formam uma sequência do mesmo projeto." };
    }
    if (validateProjectSnapshot(snapshot).length > 0) {
      return { ok: false, message: "O backup contém uma revisão que não atende ao contrato local." };
    }
  }
  if (value.catalogItems !== undefined && (!Array.isArray(value.catalogItems) || validateProjectCatalog(value.catalogItems).length > 0)) {
    return { ok: false, message: "O backup contém um catálogo de projeto inválido." };
  }
  return { ok: true, backup: value };
}

function isBackup(value: unknown): value is LocalProjectBackup {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<LocalProjectBackup>;
  return candidate.format === "rayzen-marcenaria-local-backup" &&
    typeof candidate.exportedAt === "string" && Array.isArray(candidate.snapshots) &&
    (candidate.catalogItems === undefined || Array.isArray(candidate.catalogItems));
}

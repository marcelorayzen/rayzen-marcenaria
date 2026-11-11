import type { ManufacturingReadiness, ManufacturingReadinessItem } from "./manufacturingReadiness";

/**
 * Snapshot stored with a production release. Rule confirmed on 10/11/2026:
 * the marceneiro may release with pending or blocked items only when a
 * written justification is recorded alongside the release.
 */
export interface ReleaseChecklistSnapshot {
  format: "rayzen-technical-release";
  formatVersion: 1;
  revisionNumber: number;
  items: ManufacturingReadinessItem[];
  openItemIds: string[];
  justification: string | null;
}

export type ReleaseChecklistResult =
  | { ok: true; snapshot: ReleaseChecklistSnapshot }
  | { ok: false; message: string };

/** The release item itself is what is being performed, so it never blocks. */
const RELEASE_ITEM_ID = "technical-release";

export function openReadinessItems(readiness: ManufacturingReadiness): ManufacturingReadinessItem[] {
  return readiness.items.filter(item => item.id !== RELEASE_ITEM_ID && item.status !== "ok");
}

export function buildReleaseChecklist(
  readiness: ManufacturingReadiness,
  revisionNumber: number,
  justification: string,
): ReleaseChecklistResult {
  if (!Number.isInteger(revisionNumber) || revisionNumber < 1) {
    return { ok: false, message: "A revisão a liberar é inválida." };
  }
  const items = readiness.items.filter(item => item.id !== RELEASE_ITEM_ID);
  const open = openReadinessItems(readiness);
  const text = justification.trim();
  if (open.length > 0 && text.length === 0) {
    return {
      ok: false,
      message: `Há ${open.length} item(ns) pendente(s) ou bloqueado(s): ${open.map(item => item.label).join(", ")}. Escreva a justificativa da liberação.`,
    };
  }
  if (text.length > 2000) return { ok: false, message: "A justificativa deve ter no máximo 2000 caracteres." };
  return {
    ok: true,
    snapshot: {
      format: "rayzen-technical-release",
      formatVersion: 1,
      revisionNumber,
      items: items.map(item => ({ ...item })),
      openItemIds: open.map(item => item.id),
      justification: text.length > 0 ? text : null,
    },
  };
}

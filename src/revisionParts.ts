import { createCounterModel, validateCounter } from "./furnitureEngine";
import type { ProjectSnapshot } from "./projectDomain";

/** Row shape of `public.parts`, derived only from the deterministic engine. */
export interface RevisionPartRow {
  piece_code: string;
  name: string;
  quantity: number;
  length_mm: number;
  width_mm: number;
  thickness_mm: number;
  material: string;
  edges: string;
}

export type RevisionPartsResult =
  | { ok: true; parts: RevisionPartRow[] }
  | { ok: false; message: string };

const PIECE_CODE = /^[A-Z0-9][A-Z0-9-]{0,63}$/;

/** `numeric(10, 2)` would silently round more precise values; refuse them instead. */
function fitsNumeric10x2(value: number): boolean {
  return Number.isFinite(value) && value > 0 && value < 1e8 && Math.abs(value * 100 - Math.round(value * 100)) < 1e-6;
}

/**
 * Derives the parts of one saved revision from its furniture parameters.
 * The remote table is keyed by `(revision_id, piece_code)`, so a code shared
 * by two furniture instances is rejected: no prefixing rule has been approved.
 */
export function deriveRevisionParts(snapshot: ProjectSnapshot): RevisionPartsResult {
  const parts: RevisionPartRow[] = [];
  const seen = new Set<string>();
  for (const furniture of snapshot.furniture) {
    if (furniture.kind !== "counter") {
      return { ok: false, message: `O móvel ${furniture.id} não tem motor de peças definido.` };
    }
    const issues = validateCounter(furniture.parameters);
    if (issues.length > 0) {
      return { ok: false, message: `O móvel ${furniture.label} tem parâmetros inválidos: ${issues[0]!.message}` };
    }
    for (const part of createCounterModel(furniture.parameters).parts) {
      if (!PIECE_CODE.test(part.code)) {
        return { ok: false, message: `O código de peça ${part.code} não é aceito pelo cadastro remoto.` };
      }
      if (seen.has(part.code)) {
        return {
          ok: false,
          message: `O código ${part.code} se repete entre móveis da revisão; a regra de codificação para vários móveis ainda não foi definida.`,
        };
      }
      for (const value of [part.length, part.width, part.thickness]) {
        if (!fitsNumeric10x2(value)) {
          return { ok: false, message: `A peça ${part.code} tem medida ${value} fora da precisão de 0,01 mm aceita remotamente.` };
        }
      }
      seen.add(part.code);
      parts.push({
        piece_code: part.code,
        name: part.name,
        quantity: part.quantity,
        length_mm: part.length,
        width_mm: part.width,
        thickness_mm: part.thickness,
        material: part.material,
        edges: part.edges,
      });
    }
  }
  return { ok: true, parts: sortParts(parts) };
}

export function sortParts(parts: RevisionPartRow[]): RevisionPartRow[] {
  return [...parts].sort((left, right) => left.piece_code.localeCompare(right.piece_code));
}

/** Normalizes rows returned by PostgREST (numeric columns may arrive as strings). */
export function normalizeRemotePartRow(row: Record<string, unknown>): RevisionPartRow {
  return {
    piece_code: String(row.piece_code ?? ""),
    name: String(row.name ?? ""),
    quantity: Number(row.quantity),
    length_mm: Number(row.length_mm),
    width_mm: Number(row.width_mm),
    thickness_mm: Number(row.thickness_mm),
    material: String(row.material ?? ""),
    edges: String(row.edges ?? ""),
  };
}

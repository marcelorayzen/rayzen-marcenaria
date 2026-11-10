import type { SupabaseClient } from "@supabase/supabase-js";
import { sameCanonicalJson } from "./canonicalJson";
import { normalizeRemotePartRow, sortParts, type RevisionPartRow } from "./revisionParts";

export type PartsSyncResult =
  | { status: "synced"; count: number }
  | { status: "conflict"; message: string }
  | { status: "blocked"; reason: "authentication-required" | "profile-required"; message: string }
  | { status: "failed"; message: string };

const PART_COLUMNS = "piece_code, name, quantity, length_mm, width_mm, thickness_mm, material, edges";

/**
 * Writes the derived parts of one remote revision. Parts are immutable with
 * the revision: an existing different set is a conflict, never an update.
 * All rows go in one insert statement, so a failure leaves no partial set.
 */
export async function syncRevisionParts(
  client: SupabaseClient,
  remoteRevisionId: string,
  parts: RevisionPartRow[],
): Promise<PartsSyncResult> {
  const userResult = await client.auth.getUser();
  if (userResult.error || !userResult.data.user) {
    return { status: "blocked", reason: "authentication-required", message: "Entre com uma conta autorizada antes de sincronizar as peças." };
  }
  const userId = userResult.data.user.id;
  const profileResult = await client.from("profiles").select("id").eq("id", userId).maybeSingle();
  if (profileResult.error) return { status: "failed", message: "Não foi possível verificar o perfil interno." };
  if (!profileResult.data) {
    return { status: "blocked", reason: "profile-required", message: "O usuário autenticado ainda não possui um perfil interno provisionado." };
  }
  if (!remoteRevisionId.trim()) return { status: "failed", message: "A revisão remota das peças é obrigatória." };

  const existing = await client.from("parts").select(PART_COLUMNS).eq("revision_id", remoteRevisionId);
  if (existing.error) return { status: "failed", message: "Não foi possível consultar as peças remotas da revisão." };
  const remoteRows = ((existing.data ?? []) as Array<Record<string, unknown>>).map(normalizeRemotePartRow);
  const localRows = sortParts(parts);

  if (remoteRows.length > 0) {
    return sameCanonicalJson(sortParts(remoteRows), localRows)
      ? { status: "synced", count: remoteRows.length }
      : { status: "conflict", message: "A revisão remota já possui peças diferentes das calculadas localmente; nada foi alterado." };
  }
  if (localRows.length === 0) return { status: "synced", count: 0 };

  const inserted = await client.from("parts").insert(localRows.map(row => ({ ...row, revision_id: remoteRevisionId })));
  if (inserted.error) {
    return {
      status: "failed",
      message: "Não foi possível gravar as peças remotas. Somente o autor da revisão pode gravá-las, e nunca após aprovação ou liberação.",
    };
  }
  return { status: "synced", count: localRows.length };
}

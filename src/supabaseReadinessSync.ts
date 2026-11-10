import type { SupabaseClient } from "@supabase/supabase-js";
import type { ManufacturingReadiness } from "./manufacturingReadiness";
import { sameCanonicalJson } from "./canonicalJson";

export type ReadinessSyncResult =
  | { status: "synced" }
  | { status: "conflict"; message: string }
  | { status: "blocked"; reason: "authentication-required" | "profile-required"; message: string }
  | { status: "failed"; message: string };

const sameJson = sameCanonicalJson;

export async function syncReadinessChecklist(
  client: SupabaseClient,
  remoteRevisionId: string,
  readiness: ManufacturingReadiness,
): Promise<ReadinessSyncResult> {
  const userResult = await client.auth.getUser();
  if (userResult.error || !userResult.data.user) return { status: "blocked", reason: "authentication-required", message: "Entre com uma conta autorizada antes de sincronizar o checklist." };
  const userId = userResult.data.user.id;
  const profileResult = await client.from("profiles").select("id").eq("id", userId).maybeSingle();
  if (profileResult.error) return { status: "failed", message: "Não foi possível verificar o perfil interno." };
  if (!profileResult.data) return { status: "blocked", reason: "profile-required", message: "O usuário autenticado ainda não possui um perfil interno provisionado." };
  const existing = await client.from("readiness_checklists").select("checklist, status").eq("revision_id", remoteRevisionId).maybeSingle();
  if (existing.error) return { status: "failed", message: "Não foi possível consultar o checklist remoto." };
  const checklist = { ready: readiness.ready, items: readiness.items, note: readiness.note };
  if (existing.data) {
    return sameJson(existing.data.checklist, checklist)
      ? { status: "synced" }
      : { status: "conflict", message: "A revisão remota já possui um checklist diferente; nenhuma alteração foi aplicada." };
  }
  const inserted = await client.from("readiness_checklists").insert({ revision_id: remoteRevisionId, checklist, status: "preparation-only", created_by: userId });
  if (inserted.error) return { status: "failed", message: "Não foi possível gravar o checklist remoto." };
  return { status: "synced" };
}

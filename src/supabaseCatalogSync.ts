import type { SupabaseClient } from "@supabase/supabase-js";
import type { ProjectCatalogItem } from "./projectCatalog";

export type CatalogSyncResult =
  | { status: "synced"; count: number }
  | { status: "blocked"; reason: "authentication-required" | "profile-required"; message: string }
  | { status: "failed"; message: string };

/** Syncs catalog rows without deleting remote history; local_id is the idempotency key. */
export async function syncProjectCatalog(
  client: SupabaseClient,
  projectId: string,
  items: ProjectCatalogItem[],
): Promise<CatalogSyncResult> {
  const userResult = await client.auth.getUser();
  if (userResult.error || !userResult.data.user) {
    return { status: "blocked", reason: "authentication-required", message: "Entre com uma conta autorizada antes de sincronizar o catálogo." };
  }
  const userId = userResult.data.user.id;
  const profileResult = await client.from("profiles").select("id").eq("id", userId).maybeSingle();
  if (profileResult.error) return { status: "failed", message: "Não foi possível verificar o perfil interno." };
  if (!profileResult.data) return { status: "blocked", reason: "profile-required", message: "O usuário autenticado ainda não possui um perfil interno provisionado." };
  if (!projectId.trim()) return { status: "failed", message: "O projeto remoto do catálogo é obrigatório." };
  const rows = items.map(item => ({
    project_id: projectId,
    local_id: item.id,
    code: item.code,
    name: item.name,
    kind: item.kind,
    manufacturer: item.manufacturer,
    specifications: item.specifications,
    source_reference: item.sourceReference,
    active: item.active,
    created_by: userId,
  }));
  const result = await client.from("catalog_items").upsert(rows, { onConflict: "project_id,local_id" });
  if (result.error) return { status: "failed", message: "Não foi possível sincronizar o catálogo do projeto." };
  return { status: "synced", count: rows.length };
}

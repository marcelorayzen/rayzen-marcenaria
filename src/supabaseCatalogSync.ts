import type { SupabaseClient } from "@supabase/supabase-js";
import { validateProjectCatalogItem, type ProjectCatalogItem } from "./projectCatalog";

export type CatalogSyncResult =
  | { status: "synced"; count: number }
  | { status: "blocked"; reason: "authentication-required" | "profile-required"; message: string }
  | { status: "failed"; message: string };

export type CatalogLoadResult =
  | { status: "loaded"; items: ProjectCatalogItem[] }
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

export async function loadProjectCatalog(client: SupabaseClient, remoteProjectId: string): Promise<CatalogLoadResult> {
  const userResult = await client.auth.getUser();
  if (userResult.error || !userResult.data.user) return { status: "blocked", reason: "authentication-required", message: "Entre com uma conta autorizada antes de carregar o catálogo." };
  const userId = userResult.data.user.id;
  const profileResult = await client.from("profiles").select("id").eq("id", userId).maybeSingle();
  if (profileResult.error) return { status: "failed", message: "Não foi possível verificar o perfil interno." };
  if (!profileResult.data) return { status: "blocked", reason: "profile-required", message: "O usuário autenticado ainda não possui um perfil interno provisionado." };
  const result = await client.from("catalog_items").select("local_id, code, name, kind, manufacturer, specifications, source_reference, active").eq("project_id", remoteProjectId);
  if (result.error) return { status: "failed", message: "Não foi possível carregar o catálogo remoto." };
  const items: ProjectCatalogItem[] = [];
  for (const row of (result.data ?? []) as Array<Record<string, unknown>>) {
    const item: ProjectCatalogItem = {
      id: String(row.local_id ?? ""), code: String(row.code ?? ""), name: String(row.name ?? ""),
      kind: row.kind as ProjectCatalogItem["kind"], manufacturer: typeof row.manufacturer === "string" ? row.manufacturer : null,
      specifications: row.specifications && typeof row.specifications === "object" ? row.specifications as Record<string, string> : {},
      sourceReference: String(row.source_reference ?? ""), active: row.active === true,
    };
    if (validateProjectCatalogItem(item).length > 0) return { status: "failed", message: "O catálogo remoto contém um item inválido." };
    items.push(item);
  }
  return { status: "loaded", items };
}

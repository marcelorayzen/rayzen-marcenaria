import type { SupabaseClient } from "@supabase/supabase-js";
import type { DraftSyncQueueItem } from "./draftSyncQueue";
import { sameCanonicalJson } from "./canonicalJson";

export type RemoteDraftSyncResult =
  | { status: "synced"; remoteProjectId: string; remoteRevisionId: string }
  | { status: "conflict"; message: string }
  | { status: "blocked"; reason: "authentication-required" | "profile-required"; message: string }
  | { status: "failed"; message: string };

type RemoteRow = { id: string; model?: unknown };
type RemoteError = { code?: string };

const sameJson = sameCanonicalJson;

/**
 * Synchronizes one validated local queue item using only the authenticated
 * browser client. It never uses a service key and never overwrites a remote
 * revision whose model differs from the local snapshot.
 */
export async function syncDraftQueueItem(
  client: SupabaseClient,
  item: DraftSyncQueueItem,
): Promise<RemoteDraftSyncResult> {
  const userResult = await client.auth.getUser();
  if (userResult.error || !userResult.data.user) {
    return {
      status: "blocked",
      reason: "authentication-required",
      message: "Entre com uma conta autorizada antes de sincronizar o rascunho.",
    };
  }

  const userId = userResult.data.user.id;
  const profileResult = await client
    .from("profiles")
    .select("id")
    .eq("id", userId)
    .maybeSingle();
  if (profileResult.error) {
    return { status: "failed", message: "Não foi possível verificar o perfil interno." };
  }
  if (!profileResult.data) {
    return {
      status: "blocked",
      reason: "profile-required",
      message: "O usuário autenticado ainda não possui um perfil interno provisionado.",
    };
  }

  const remoteProjectId = item.remoteProjectId;
  if (!remoteProjectId) {
    return { status: "failed", message: "O projeto local ainda não possui um vínculo remoto reservado." };
  }

  const existingProjectResult = await client
    .from("projects")
    .select("id")
    .eq("id", remoteProjectId)
    .maybeSingle();
  if (existingProjectResult.error) {
    return { status: "failed", message: "Não foi possível consultar o vínculo do projeto remoto." };
  }

  if (!existingProjectResult.data) {
    const projectResult = await client
      .from("projects")
      .insert({ id: remoteProjectId, title: item.snapshot.project.title, owner_id: userId })
      .select("id")
      .single();
    if (projectResult.error || !projectResult.data) {
      return { status: "failed", message: "Não foi possível criar o projeto remoto." };
    }
  }

  const membershipResult = await client
    .from("project_members")
    .insert({ project_id: remoteProjectId, user_id: userId });
  if (membershipResult.error && (membershipResult.error as RemoteError).code !== "23505") {
    return { status: "failed", message: "Não foi possível registrar o membro do projeto remoto." };
  }

  const existingResult = await client
    .from("revisions")
    .select("id, model")
    .eq("project_id", remoteProjectId)
    .eq("number", item.snapshot.revision.number)
    .maybeSingle();
  if (existingResult.error) {
    return { status: "failed", message: "Não foi possível consultar a revisão remota." };
  }
  if (existingResult.data) {
    const existing = existingResult.data as RemoteRow;
    if (!sameJson(existing.model, item.snapshot)) {
      return {
        status: "conflict",
        message: "A mesma revisão já existe remotamente com conteúdo diferente.",
      };
    }
    return {
      status: "synced",
      remoteProjectId,
      remoteRevisionId: existing.id,
    };
  }

  const revisionResult = await client
    .from("revisions")
    .insert({
      project_id: remoteProjectId,
      number: item.snapshot.revision.number,
      model: item.snapshot,
      created_by: userId,
      created_at: item.snapshot.revision.createdAt,
    })
    .select("id")
    .single();
  if (revisionResult.error || !revisionResult.data) {
    return { status: "failed", message: "Não foi possível gravar a revisão remota." };
  }
  return {
    status: "synced",
    remoteProjectId,
    remoteRevisionId: (revisionResult.data as RemoteRow).id,
  };
}

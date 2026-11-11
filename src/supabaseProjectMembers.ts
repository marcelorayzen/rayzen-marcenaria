import type { SupabaseClient } from "@supabase/supabase-js";

export interface InternalTeamMember {
  id: string;
  displayName: string;
  isMember: boolean;
}

type Blocked = { status: "blocked"; reason: "authentication-required"; message: string };
type Failed = { status: "failed"; message: string };

export type TeamLoadResult = { status: "loaded"; members: InternalTeamMember[] } | Blocked | Failed;
export type AddMemberResult = { status: "added" } | { status: "already-member" } | Blocked | Failed;

/** Lists internal profiles and marks who already belongs to the remote project. */
export async function loadProjectTeam(client: SupabaseClient, remoteProjectId: string): Promise<TeamLoadResult> {
  const userResult = await client.auth.getUser();
  if (userResult.error || !userResult.data.user) {
    return { status: "blocked", reason: "authentication-required", message: "Entre com uma conta autorizada antes de ver a equipe." };
  }
  const profiles = await client.from("profiles").select("id, display_name").order("display_name", { ascending: true });
  if (profiles.error) return { status: "failed", message: "Não foi possível carregar a equipe interna." };
  const members = await client.from("project_members").select("user_id").eq("project_id", remoteProjectId);
  if (members.error) return { status: "failed", message: "Não foi possível carregar os membros do projeto." };
  const memberIds = new Set(((members.data ?? []) as Array<Record<string, unknown>>).map(row => String(row.user_id)));
  return {
    status: "loaded",
    members: ((profiles.data ?? []) as Array<Record<string, unknown>>).map(row => ({
      id: String(row.id),
      displayName: String(row.display_name ?? ""),
      isMember: memberIds.has(String(row.id)),
    })),
  };
}

/**
 * Adds an internal member. Only a representante who is a member of the
 * project is allowed by RLS; a refusal is reported, never hidden.
 */
export async function addProjectMember(client: SupabaseClient, remoteProjectId: string, userId: string): Promise<AddMemberResult> {
  const userResult = await client.auth.getUser();
  if (userResult.error || !userResult.data.user) {
    return { status: "blocked", reason: "authentication-required", message: "Entre com uma conta autorizada antes de adicionar membros." };
  }
  if (!remoteProjectId.trim() || !userId.trim()) return { status: "failed", message: "Projeto remoto e membro são obrigatórios." };
  const result = await client.from("project_members").insert({ project_id: remoteProjectId, user_id: userId });
  if (!result.error) return { status: "added" };
  const code = (result.error as { code?: string }).code;
  if (code === "23505") return { status: "already-member" };
  if (code === "42501") {
    return { status: "failed", message: "Somente um representante que participa deste projeto pode adicionar membros." };
  }
  return { status: "failed", message: "Não foi possível adicionar o membro ao projeto." };
}

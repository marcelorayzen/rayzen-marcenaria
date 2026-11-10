import type { SupabaseClient } from "@supabase/supabase-js";
import { type ProjectSnapshot, validateProjectSnapshot } from "./projectDomain";

export interface RemoteProjectSummary {
  remoteProjectId: string;
  title: string;
  createdAt: string;
}

export interface RemoteRevision {
  remoteRevisionId: string;
  snapshot: ProjectSnapshot;
}

type Blocked = { status: "blocked"; reason: "authentication-required" | "profile-required"; message: string };
type Failed = { status: "failed"; message: string };

export type RemoteProjectListResult = { status: "loaded"; projects: RemoteProjectSummary[] } | Blocked | Failed;
export type RemoteRevisionLoadResult = { status: "loaded"; revisions: RemoteRevision[] } | Blocked | Failed;

async function requireProfile(client: SupabaseClient, action: string): Promise<Blocked | Failed | null> {
  const userResult = await client.auth.getUser();
  if (userResult.error || !userResult.data.user) {
    return { status: "blocked", reason: "authentication-required", message: `Entre com uma conta autorizada antes de ${action}.` };
  }
  const profileResult = await client.from("profiles").select("id").eq("id", userResult.data.user.id).maybeSingle();
  if (profileResult.error) return { status: "failed", message: "Não foi possível verificar o perfil interno." };
  if (!profileResult.data) {
    return { status: "blocked", reason: "profile-required", message: "O usuário autenticado ainda não possui um perfil interno provisionado." };
  }
  return null;
}

/** Lists projects visible to the session. Visibility is decided by RLS only. */
export async function listRemoteProjects(client: SupabaseClient): Promise<RemoteProjectListResult> {
  const blocked = await requireProfile(client, "listar projetos remotos");
  if (blocked) return blocked;
  const result = await client
    .from("projects")
    .select("id, title, created_at")
    .is("archived_at", null)
    .order("created_at", { ascending: false });
  if (result.error) return { status: "failed", message: "Não foi possível listar os projetos remotos." };
  const projects = ((result.data ?? []) as Array<Record<string, unknown>>).map(row => ({
    remoteProjectId: String(row.id ?? ""),
    title: String(row.title ?? ""),
    createdAt: String(row.created_at ?? ""),
  }));
  if (projects.some(project => !project.remoteProjectId || !project.title.trim())) {
    return { status: "failed", message: "A lista remota contém um projeto sem identificação." };
  }
  return { status: "loaded", projects };
}

/**
 * Loads every revision of one remote project and refuses the whole set when
 * any snapshot is invalid, belongs to another local project or has a number
 * that differs from its row. Nothing is partially returned.
 */
export async function loadRemoteRevisions(client: SupabaseClient, remoteProjectId: string): Promise<RemoteRevisionLoadResult> {
  const blocked = await requireProfile(client, "recuperar revisões remotas");
  if (blocked) return blocked;
  if (!remoteProjectId.trim()) return { status: "failed", message: "O projeto remoto é obrigatório." };
  const result = await client
    .from("revisions")
    .select("id, number, model")
    .eq("project_id", remoteProjectId)
    .order("number", { ascending: true });
  if (result.error) return { status: "failed", message: "Não foi possível carregar as revisões remotas." };

  const revisions: RemoteRevision[] = [];
  let localProjectId: string | null = null;
  for (const row of (result.data ?? []) as Array<Record<string, unknown>>) {
    const snapshot = row.model as ProjectSnapshot | null;
    if (!snapshot || typeof snapshot !== "object" || !snapshot.project || !snapshot.revision) {
      return { status: "failed", message: `A revisão remota R${String(row.number)} não contém um snapshot reconhecível.` };
    }
    const issues = validateProjectSnapshot(snapshot);
    if (issues.length > 0) {
      return { status: "failed", message: `A revisão remota R${String(row.number)} é inválida: ${issues[0]!.path} — ${issues[0]!.message}` };
    }
    if (snapshot.revision.number !== row.number) {
      return { status: "failed", message: `A revisão remota R${String(row.number)} declara outro número no snapshot.` };
    }
    if (localProjectId !== null && snapshot.project.id !== localProjectId) {
      return { status: "failed", message: "As revisões remotas apontam para projetos locais diferentes." };
    }
    localProjectId = snapshot.project.id;
    revisions.push({ remoteRevisionId: String(row.id), snapshot });
  }
  return { status: "loaded", revisions };
}

import type { SupabaseClient } from "@supabase/supabase-js";
import type { ReleaseChecklistSnapshot } from "./technicalRelease";

export type ApprovalChannel = "whatsapp" | "sistema_comercial";

export interface RevisionApprovalState {
  approval: { channel: ApprovalChannel; evidence: string; recordedAt: string } | null;
  release: { releasedAt: string; justification: string | null } | null;
}

type Blocked = { status: "blocked"; reason: "authentication-required"; message: string };
type Failed = { status: "failed"; message: string };

export type ApprovalStateResult = { status: "loaded"; state: RevisionApprovalState } | Blocked | Failed;
export type GateActionResult = { status: "recorded"; id: string } | Blocked | Failed;

async function requireSession(client: SupabaseClient, action: string): Promise<Blocked | null> {
  const userResult = await client.auth.getUser();
  if (userResult.error || !userResult.data.user) {
    return { status: "blocked", reason: "authentication-required", message: `Entre com uma conta autorizada antes de ${action}.` };
  }
  return null;
}

/** Server rule messages (raise exception) are safe and actionable; show them. */
function rpcFailure(error: { code?: string; message?: string }, fallback: string): Failed {
  if (error.code === "P0001" && error.message) return { status: "failed", message: error.message };
  if (error.code === "23505") return { status: "failed", message: "Esta revisão já possui este registro." };
  return { status: "failed", message: fallback };
}

export async function loadRevisionApprovalState(client: SupabaseClient, remoteRevisionId: string): Promise<ApprovalStateResult> {
  const blocked = await requireSession(client, "consultar aprovações");
  if (blocked) return blocked;
  const approval = await client.from("commercial_approvals")
    .select("channel, evidence_reference, recorded_at").eq("revision_id", remoteRevisionId).maybeSingle();
  if (approval.error) return { status: "failed", message: "Não foi possível consultar a aprovação comercial." };
  const release = await client.from("production_releases")
    .select("released_at, checklist_snapshot").eq("revision_id", remoteRevisionId).maybeSingle();
  if (release.error) return { status: "failed", message: "Não foi possível consultar a liberação técnica." };
  const approvalRow = approval.data as Record<string, unknown> | null;
  const releaseRow = release.data as Record<string, unknown> | null;
  const snapshot = releaseRow?.checklist_snapshot as { justification?: unknown } | undefined;
  return {
    status: "loaded",
    state: {
      approval: approvalRow ? {
        channel: approvalRow.channel as ApprovalChannel,
        evidence: String(approvalRow.evidence_reference ?? ""),
        recordedAt: String(approvalRow.recorded_at ?? ""),
      } : null,
      release: releaseRow ? {
        releasedAt: String(releaseRow.released_at ?? ""),
        justification: typeof snapshot?.justification === "string" ? snapshot.justification : null,
      } : null,
    },
  };
}

export async function recordCommercialApproval(
  client: SupabaseClient,
  remoteRevisionId: string,
  channel: ApprovalChannel,
  evidence: string,
): Promise<GateActionResult> {
  const blocked = await requireSession(client, "registrar a aprovação comercial");
  if (blocked) return blocked;
  const text = evidence.trim();
  if (text.length === 0 || text.length > 500) {
    return { status: "failed", message: "Descreva a evidência da aprovação (até 500 caracteres)." };
  }
  const result = await client.rpc("record_commercial_approval", {
    p_revision_id: remoteRevisionId, p_channel: channel, p_evidence_reference: text,
  });
  if (result.error) return rpcFailure(result.error, "Não foi possível registrar a aprovação comercial.");
  return { status: "recorded", id: String(result.data) };
}

export async function releaseRevision(
  client: SupabaseClient,
  remoteRevisionId: string,
  snapshot: ReleaseChecklistSnapshot,
): Promise<GateActionResult> {
  const blocked = await requireSession(client, "liberar a produção");
  if (blocked) return blocked;
  const result = await client.rpc("release_production", { p_revision_id: remoteRevisionId, p_checklist_snapshot: snapshot });
  if (result.error) return rpcFailure(result.error, "Não foi possível liberar a revisão.");
  return { status: "recorded", id: String(result.data) };
}

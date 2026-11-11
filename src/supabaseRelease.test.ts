import { describe, expect, it } from "vitest";
import { loadRevisionApprovalState, recordCommercialApproval, releaseRevision } from "./supabaseRelease";
import type { ReleaseChecklistSnapshot } from "./technicalRelease";

const snapshot: ReleaseChecklistSnapshot = {
  format: "rayzen-technical-release", formatVersion: 1, revisionNumber: 1,
  items: [{ id: "x", label: "X", status: "ok", detail: "" }], openItemIds: [], justification: null,
};

function createClient(options: {
  rpcError?: { code: string; message: string };
  approval?: Record<string, unknown> | null;
  release?: Record<string, unknown> | null;
  session?: boolean;
} = {}) {
  const rpcCalls: Array<{ name: string; args: unknown }> = [];
  class Query {
    constructor(private readonly table: string) {}
    select() { return this; }
    eq() { return this; }
    maybeSingle() {
      const data = this.table === "commercial_approvals" ? options.approval ?? null : options.release ?? null;
      return Promise.resolve({ data, error: null });
    }
  }
  return {
    client: {
      auth: { getUser: async () => (options.session === false
        ? { data: { user: null }, error: new Error("no session") }
        : { data: { user: { id: "user-1" } }, error: null }) },
      from: (table: string) => new Query(table),
      rpc: async (name: string, args: unknown) => {
        rpcCalls.push({ name, args });
        return options.rpcError ? { data: null, error: options.rpcError } : { data: "gate-1", error: null };
      },
    } as never,
    rpcCalls,
  };
}

describe("commercial approval and technical release adapter", () => {
  it("reads approval and release state of a remote revision", async () => {
    const fake = createClient({
      approval: { channel: "whatsapp", evidence_reference: "Cliente confirmou", recorded_at: "2026-11-11T10:00:00Z" },
      release: { released_at: "2026-11-11T11:00:00Z", checklist_snapshot: { justification: "Conferido" } },
    });
    await expect(loadRevisionApprovalState(fake.client, "rev-1")).resolves.toEqual({
      status: "loaded",
      state: {
        approval: { channel: "whatsapp", evidence: "Cliente confirmou", recordedAt: "2026-11-11T10:00:00Z" },
        release: { releasedAt: "2026-11-11T11:00:00Z", justification: "Conferido" },
      },
    });
  });

  it("requires evidence before calling the approval function", async () => {
    const fake = createClient();
    await expect(recordCommercialApproval(fake.client, "rev-1", "whatsapp", "  ")).resolves.toMatchObject({ status: "failed" });
    expect(fake.rpcCalls).toEqual([]);
    await expect(recordCommercialApproval(fake.client, "rev-1", "whatsapp", "Cliente confirmou")).resolves.toEqual({ status: "recorded", id: "gate-1" });
  });

  it("shows the server rule message when the release is refused", async () => {
    const fake = createClient({ rpcError: { code: "P0001", message: "Aprovação comercial ausente" } });
    await expect(releaseRevision(fake.client, "rev-1", snapshot)).resolves.toEqual({ status: "failed", message: "Aprovação comercial ausente" });
  });

  it("does not leak unexpected database errors", async () => {
    const fake = createClient({ rpcError: { code: "XX000", message: "internal detail" } });
    await expect(releaseRevision(fake.client, "rev-1", snapshot)).resolves.toEqual({ status: "failed", message: "Não foi possível liberar a revisão." });
  });

  it("blocks without a session", async () => {
    const fake = createClient({ session: false });
    await expect(releaseRevision(fake.client, "rev-1", snapshot)).resolves.toMatchObject({ status: "blocked" });
    expect(fake.rpcCalls).toEqual([]);
  });
});

import { describe, expect, it } from "vitest";
import { getManufacturingReadiness } from "./manufacturingReadiness";
import { syncReadinessChecklist } from "./supabaseReadinessSync";

const readiness = getManufacturingReadiness({ schemaVersion: 1, project: { id: "p", title: "P" }, revision: { id: "r", number: 1, createdAt: "2026-11-10T00:00:00.000Z" }, evidence: [], measurements: [], observations: [], pendingItems: [], physicalConstraints: [], furniture: [], specifications: [] });

describe("Supabase readiness synchronization", () => {
  it("blocks without authentication", async () => {
    const client = { auth: { getUser: async () => ({ data: { user: null }, error: new Error("no session") }) }, from: () => { throw new Error("must not query"); } } as never;
    await expect(syncReadinessChecklist(client, "revision-1", readiness)).resolves.toMatchObject({ status: "blocked", reason: "authentication-required" });
  });

  it("does not overwrite a different remote checklist", async () => {
    const client = { auth: { getUser: async () => ({ data: { user: { id: "user-1" } }, error: null }) }, from: (table: string) => ({ select: () => ({ eq: () => ({ maybeSingle: async () => table === "profiles" ? { data: { id: "user-1" }, error: null } : { data: { checklist: { different: true }, status: "preparation-only" }, error: null } }) }) }) } as never;
    await expect(syncReadinessChecklist(client, "revision-1", readiness)).resolves.toMatchObject({ status: "conflict" });
  });
});

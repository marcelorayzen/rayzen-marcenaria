import { describe, expect, it } from "vitest";
import { loadProjectCatalog, syncProjectCatalog } from "./supabaseCatalogSync";

const item = { id: "catalog-door-1", code: "PT-01", name: "Porta", kind: "door" as const, manufacturer: null, specifications: { profile: "J" }, sourceReference: "Oficina", active: true };

describe("Supabase catalog synchronization", () => {
  it("blocks without a session before querying profiles or catalog", async () => {
    const calls: string[] = [];
    const client = { auth: { getUser: async () => ({ data: { user: null }, error: new Error("no session") }) }, from: () => { calls.push("from"); throw new Error("must not query"); } } as never;
    await expect(syncProjectCatalog(client, "project-1", [item])).resolves.toMatchObject({ status: "blocked", reason: "authentication-required" });
    expect(calls).toEqual([]);
  });

  it("upserts local identities without deleting inactive history", async () => {
    const calls: Array<{ table: string; rows?: unknown[]; options?: unknown }> = [];
    const client = {
      auth: { getUser: async () => ({ data: { user: { id: "user-1" } }, error: null }) },
      from: (table: string) => ({
        select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { id: "user-1" }, error: null }) }) }),
        upsert: async (rows: unknown[], options: unknown) => { calls.push({ table, rows, options }); return { data: null, error: null }; },
      }),
    } as never;
    await expect(syncProjectCatalog(client, "project-1", [item])).resolves.toEqual({ status: "synced", count: 1 });
    expect(calls[0]).toMatchObject({ table: "catalog_items", options: { onConflict: "project_id,local_id" } });
    expect(calls[0].rows?.[0]).toMatchObject({ project_id: "project-1", local_id: "catalog-door-1", created_by: "user-1" });
  });

  it("loads remote rows using local_id as the browser identity", async () => {
    const client = {
      auth: { getUser: async () => ({ data: { user: { id: "user-1" } }, error: null }) },
      from: (table: string) => {
        const query = {
          eq: () => query,
          maybeSingle: async () => table === "profiles" ? { data: { id: "user-1" }, error: null } : null,
          then: (resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) => Promise.resolve({ data: [{ local_id: "catalog-door-1", code: "PT-01", name: "Porta", kind: "door", manufacturer: null, specifications: { profile: "J" }, source_reference: "Oficina", active: true }], error: null }).then(resolve, reject),
        };
        return { select: () => query };
      },
    } as never;
    await expect(loadProjectCatalog(client, "project-1")).resolves.toMatchObject({ status: "loaded", items: [item] });
  });
});

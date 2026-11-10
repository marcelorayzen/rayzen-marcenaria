import { describe, expect, it } from "vitest";
import { listRemoteProjects, loadRemoteRevisions } from "./supabaseProjectRecovery";
import { fixtureSnapshot, reverseKeys } from "./testSnapshots";

function createRecoveryClient(revisionRows: Array<Record<string, unknown>>, user = true) {
  const calls: string[] = [];
  class Query {
    private filters = new Map<string, unknown>();
    constructor(private readonly table: string) { calls.push(table); }
    select() { return this; }
    eq(column: string, value: unknown) { this.filters.set(column, value); return this; }
    is(column: string, value: unknown) { this.filters.set(column, value); return this; }
    order() { return this; }
    maybeSingle() { return Promise.resolve({ data: { id: "user-1" }, error: null }); }
    then(resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) {
      const data = this.table === "projects"
        ? [{ id: "11111111-1111-4111-8111-111111111111", title: "Projeto de ensaio", created_at: "2026-11-10T10:00:00Z" }]
        : revisionRows;
      return Promise.resolve({ data, error: null }).then(resolve, reject);
    }
  }
  return {
    client: {
      auth: { getUser: async () => (user ? { data: { user: { id: "user-1" } }, error: null } : { data: { user: null }, error: new Error("no session") }) },
      from: (table: string) => new Query(table),
    } as never,
    calls,
  };
}

describe("Supabase project recovery", () => {
  it("lists projects visible to the session", async () => {
    const fake = createRecoveryClient([]);
    await expect(listRemoteProjects(fake.client)).resolves.toEqual({
      status: "loaded",
      projects: [{ remoteProjectId: "11111111-1111-4111-8111-111111111111", title: "Projeto de ensaio", createdAt: "2026-11-10T10:00:00Z" }],
    });
  });

  it("loads validated revisions in order", async () => {
    const fake = createRecoveryClient([
      { id: "remote-1", number: 1, model: reverseKeys(fixtureSnapshot(1)) },
      { id: "remote-2", number: 2, model: reverseKeys(fixtureSnapshot(2)) },
    ]);
    const result = await loadRemoteRevisions(fake.client, "11111111-1111-4111-8111-111111111111");
    expect(result.status).toBe("loaded");
    if (result.status === "loaded") expect(result.revisions.map(revision => revision.remoteRevisionId)).toEqual(["remote-1", "remote-2"]);
  });

  it("refuses the whole set when one snapshot is invalid or mismatched", async () => {
    const invalid = fixtureSnapshot(2);
    invalid.project.title = "";
    await expect(loadRemoteRevisions(createRecoveryClient([
      { id: "remote-1", number: 1, model: fixtureSnapshot(1) },
      { id: "remote-2", number: 2, model: invalid },
    ]).client, "p")).resolves.toMatchObject({ status: "failed" });

    await expect(loadRemoteRevisions(createRecoveryClient([
      { id: "remote-1", number: 2, model: fixtureSnapshot(1) },
    ]).client, "p")).resolves.toMatchObject({ status: "failed" });

    await expect(loadRemoteRevisions(createRecoveryClient([
      { id: "remote-1", number: 1, model: fixtureSnapshot(1) },
      { id: "remote-2", number: 2, model: fixtureSnapshot(2, 800, "other-local-project") },
    ]).client, "p")).resolves.toMatchObject({ status: "failed" });
  });

  it("blocks without a session before reading project tables", async () => {
    const fake = createRecoveryClient([], false);
    await expect(listRemoteProjects(fake.client)).resolves.toMatchObject({ status: "blocked", reason: "authentication-required" });
    expect(fake.calls).toEqual([]);
  });
});

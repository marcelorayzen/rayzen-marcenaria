import { describe, expect, it } from "vitest";
import { deriveRevisionParts, type RevisionPartRow } from "./revisionParts";
import { syncRevisionParts } from "./supabasePartsSync";
import { fixtureSnapshot } from "./testSnapshots";

function derived(width = 800): RevisionPartRow[] {
  const result = deriveRevisionParts(fixtureSnapshot(1, width));
  if (!result.ok) throw new Error(result.message);
  return result.parts;
}

function createPartsClient(options: { insertError?: boolean; profile?: boolean } = {}) {
  const stored = new Map<string, Array<Record<string, unknown>>>();
  let insertCalls = 0;

  class Query {
    private operation: "select" | "insert" = "select";
    private payload: unknown = null;
    private filters = new Map<string, unknown>();
    constructor(private readonly table: string) {}
    select() { return this; }
    eq(column: string, value: unknown) { this.filters.set(column, value); return this; }
    insert(payload: unknown) { this.operation = "insert"; this.payload = payload; return this; }
    maybeSingle() { return Promise.resolve(this.resolve()); }
    then(resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) {
      return Promise.resolve(this.resolve()).then(resolve, reject);
    }
    private resolve() {
      if (this.table === "profiles") return { data: options.profile === false ? null : { id: "user-1" }, error: null };
      if (this.table !== "parts") throw new Error(`Unexpected table ${this.table}`);
      if (this.operation === "select") {
        // PostgREST may serialize numeric columns as strings.
        const rows = stored.get(String(this.filters.get("revision_id"))) ?? [];
        return { data: [...rows].reverse().map(row => ({ ...row, length_mm: String(row.length_mm) })), error: null };
      }
      insertCalls += 1;
      if (options.insertError) return { data: null, error: { code: "42501" } };
      const rows = this.payload as Array<Record<string, unknown>>;
      stored.set(String(rows[0]!.revision_id), rows.map(({ revision_id: _ignored, ...row }) => row));
      return { data: null, error: null };
    }
  }

  return {
    client: {
      auth: { getUser: async () => ({ data: { user: { id: "user-1" } }, error: null }) },
      from: (table: string) => new Query(table),
    } as never,
    insertCalls: () => insertCalls,
    stored,
  };
}

describe("Supabase revision parts synchronization", () => {
  it("inserts the derived parts once and accepts an identical retry", async () => {
    const fake = createPartsClient();
    await expect(syncRevisionParts(fake.client, "remote-revision-1", derived())).resolves.toEqual({ status: "synced", count: 3 });
    await expect(syncRevisionParts(fake.client, "remote-revision-1", derived())).resolves.toEqual({ status: "synced", count: 3 });
    expect(fake.insertCalls()).toBe(1);
  });

  it("reports a conflict instead of updating different remote parts", async () => {
    const fake = createPartsClient();
    await syncRevisionParts(fake.client, "remote-revision-1", derived(800));
    const result = await syncRevisionParts(fake.client, "remote-revision-1", derived(900));
    expect(result.status).toBe("conflict");
    expect(fake.insertCalls()).toBe(1);
    expect(fake.stored.get("remote-revision-1")?.find(row => row.piece_code === "BC-02")?.length_mm).toBe(764);
  });

  it("surfaces RLS refusal as a failure without claiming success", async () => {
    const fake = createPartsClient({ insertError: true });
    const result = await syncRevisionParts(fake.client, "remote-revision-1", derived());
    expect(result.status).toBe("failed");
  });

  it("blocks without a provisioned profile", async () => {
    const fake = createPartsClient({ profile: false });
    await expect(syncRevisionParts(fake.client, "remote-revision-1", derived())).resolves.toMatchObject({ status: "blocked", reason: "profile-required" });
    expect(fake.insertCalls()).toBe(0);
  });
});

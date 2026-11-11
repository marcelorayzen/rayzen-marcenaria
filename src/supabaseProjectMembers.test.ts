import { describe, expect, it } from "vitest";
import { addProjectMember, loadProjectTeam } from "./supabaseProjectMembers";

function createTeamClient(insertError: { code: string } | null = null) {
  class Query {
    constructor(private readonly table: string) {}
    select() { return this; }
    order() { return this; }
    eq() { return this; }
    insert() { return this; }
    then(resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) {
      const data = this.table === "profiles"
        ? [{ id: "user-a", display_name: "Fixture A" }, { id: "user-b", display_name: "Fixture B" }]
        : [{ user_id: "user-a" }];
      return Promise.resolve(this.table === "project_members" && insertError !== undefined && this.inserting
        ? { data: null, error: insertError }
        : { data, error: null }).then(resolve, reject);
    }
    inserting = false;
  }
  return {
    auth: { getUser: async () => ({ data: { user: { id: "user-a" } }, error: null }) },
    from: (table: string) => {
      const query = new Query(table);
      const insert = query.insert.bind(query);
      query.insert = () => { query.inserting = true; return insert(); };
      return query;
    },
  } as never;
}

describe("project team membership", () => {
  it("marks which internal users already belong to the project", async () => {
    await expect(loadProjectTeam(createTeamClient(), "project-1")).resolves.toEqual({
      status: "loaded",
      members: [
        { id: "user-a", displayName: "Fixture A", isMember: true },
        { id: "user-b", displayName: "Fixture B", isMember: false },
      ],
    });
  });

  it("adds a member and treats a repeated add as already done", async () => {
    await expect(addProjectMember(createTeamClient(), "project-1", "user-b")).resolves.toEqual({ status: "added" });
    await expect(addProjectMember(createTeamClient({ code: "23505" }), "project-1", "user-b")).resolves.toEqual({ status: "already-member" });
  });

  it("explains an RLS refusal instead of claiming success", async () => {
    const result = await addProjectMember(createTeamClient({ code: "42501" }), "project-1", "user-b");
    expect(result).toEqual({ status: "failed", message: "Somente um representante que participa deste projeto pode adicionar membros." });
  });
});

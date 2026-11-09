import { describe, expect, it } from "vitest";
import { confirmedInternalTeam, validateInternalTeam } from "./internalTeam";

describe("confirmed internal team", () => {
  it("keeps the confirmed names and responsibilities", () => {
    expect(confirmedInternalTeam).toEqual([
      { displayName: "Kevin", roles: ["marceneiro"] },
      { displayName: "Moises", roles: ["marceneiro", "representante"] },
      { displayName: "Marcelo", roles: ["marceneiro"] },
      { displayName: "Tais", roles: ["representante"] },
    ]);
    expect(validateInternalTeam(confirmedInternalTeam)).toEqual([]);
  });

  it("rejects duplicate members and missing responsibilities", () => {
    expect(validateInternalTeam([
      { displayName: "Kevin", roles: [] },
      { displayName: "kevin", roles: ["representante"] },
    ])).toEqual([
      "Kevin precisa de ao menos um papel.",
      "Membro duplicado: kevin.",
      "É necessário ao menos um marceneiro.",
    ]);
  });
});

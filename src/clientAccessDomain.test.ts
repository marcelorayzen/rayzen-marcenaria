import { describe, expect, it } from "vitest";
import {
  clientCanPerform,
  validateClientInvite,
  type ClientInvite,
} from "./clientAccessDomain";

const invite: ClientInvite = {
  id: "invite-1",
  projectId: "project-1",
  phoneE164: "+5511999999999",
  status: "verified",
  createdAt: "2026-11-08T15:00:00.000Z",
  expiresAt: "2026-11-15T15:00:00.000Z",
  deliveredAt: "2026-11-08T15:01:00.000Z",
  verifiedAt: "2026-11-08T15:02:00.000Z",
};

describe("client access contract", () => {
  it("accepts a verified invitation bound to an invited phone", () => {
    expect(validateClientInvite(invite)).toEqual([]);
  });

  it("rejects an invalid phone and an expiration before creation", () => {
    const issues = validateClientInvite({
      ...invite,
      phoneE164: "11999999999",
      expiresAt: "2026-11-08T14:59:59.000Z",
    });

    expect(issues).toContainEqual({
      path: "phoneE164",
      message: "Informe o telefone no formato internacional E.164.",
    });
    expect(issues).toContainEqual({
      path: "expiresAt",
      message: "O convite precisa expirar depois de ser criado.",
    });
  });

  it("requires evidence when an invite becomes delivered, verified, or revoked", () => {
    expect(
      validateClientInvite({ ...invite, status: "verified", verifiedAt: undefined }),
    ).toContainEqual({
      path: "verifiedAt",
      message: "O acesso verificado precisa registrar a data da verificação.",
    });
  });

  it("limits customer actions to briefing and illustrative review", () => {
    expect(clientCanPerform("start-briefing")).toBe(true);
    expect(clientCanPerform("confirm-illustration")).toBe(true);
  });
});

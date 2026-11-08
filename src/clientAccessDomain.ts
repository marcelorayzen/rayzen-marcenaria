/**
 * Contract for restricted customer access. It intentionally does not select or
 * configure a phone-auth provider; providers are adapters around these states.
 */
export type ClientInviteStatus =
  | "created"
  | "delivered"
  | "verified"
  | "expired"
  | "revoked";

export type ClientAccessAction =
  | "start-briefing"
  | "submit-reference"
  | "view-illustration"
  | "request-change"
  | "confirm-illustration";

export interface ClientInvite {
  id: string;
  projectId: string;
  phoneE164: string;
  status: ClientInviteStatus;
  createdAt: string;
  expiresAt: string;
  deliveredAt?: string;
  verifiedAt?: string;
  revokedAt?: string;
}

export interface ClientAccessValidationIssue {
  path: string;
  message: string;
}

const e164PhonePattern = /^\+[1-9]\d{7,14}$/;

/**
 * Customer access is deliberately narrow. It cannot directly edit technical
 * geometry, parts, rules, material, approvals, or production release.
 */
export function clientCanPerform(action: ClientAccessAction): boolean {
  return (
    action === "start-briefing" ||
    action === "submit-reference" ||
    action === "view-illustration" ||
    action === "request-change" ||
    action === "confirm-illustration"
  );
}

export function validateClientInvite(
  invite: ClientInvite,
): ClientAccessValidationIssue[] {
  const issues: ClientAccessValidationIssue[] = [];

  requireText(issues, "id", invite.id);
  requireText(issues, "projectId", invite.projectId);

  if (!e164PhonePattern.test(invite.phoneE164)) {
    issues.push({
      path: "phoneE164",
      message: "Informe o telefone no formato internacional E.164.",
    });
  }

  const createdAt = parseDate(issues, "createdAt", invite.createdAt);
  const expiresAt = parseDate(issues, "expiresAt", invite.expiresAt);
  if (createdAt !== undefined && expiresAt !== undefined && expiresAt <= createdAt) {
    issues.push({
      path: "expiresAt",
      message: "O convite precisa expirar depois de ser criado.",
    });
  }

  validateStatusTimestamps(issues, invite);
  return issues;
}

function validateStatusTimestamps(
  issues: ClientAccessValidationIssue[],
  invite: ClientInvite,
) {
  if (invite.status === "delivered" && invite.deliveredAt === undefined) {
    issues.push({
      path: "deliveredAt",
      message: "O convite entregue precisa registrar a data de entrega.",
    });
  }
  if (invite.status === "verified" && invite.verifiedAt === undefined) {
    issues.push({
      path: "verifiedAt",
      message: "O acesso verificado precisa registrar a data da verificação.",
    });
  }
  if (invite.status === "revoked" && invite.revokedAt === undefined) {
    issues.push({
      path: "revokedAt",
      message: "O convite revogado precisa registrar a data da revogação.",
    });
  }

  if (invite.deliveredAt !== undefined) parseDate(issues, "deliveredAt", invite.deliveredAt);
  if (invite.verifiedAt !== undefined) parseDate(issues, "verifiedAt", invite.verifiedAt);
  if (invite.revokedAt !== undefined) parseDate(issues, "revokedAt", invite.revokedAt);
}

function requireText(
  issues: ClientAccessValidationIssue[],
  path: string,
  value: string,
) {
  if (value.trim().length === 0) {
    issues.push({ path, message: "Informe um texto não vazio." });
  }
}

function parseDate(
  issues: ClientAccessValidationIssue[],
  path: string,
  value: string,
): number | undefined {
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) {
    issues.push({ path, message: "Informe uma data válida." });
    return undefined;
  }
  return parsed;
}

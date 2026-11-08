export type DataUsePurpose =
  | "project-operation"
  | "authorized-migration"
  | "product-improvement";

export type ConsentStatus = "active" | "withdrawn";

/**
 * Immutable evidence that the customer accepted the current policy when
 * creating access/project. It authorizes a governed improvement pipeline, not
 * automatic transmission of every project to an external AI provider.
 */
export interface DataUseConsent {
  id: string;
  projectId: string;
  subjectId: string;
  policyVersion: string;
  purposes: DataUsePurpose[];
  status: ConsentStatus;
  acceptedAt: string;
  withdrawnAt?: string;
}

export interface ConsentValidationIssue {
  path: string;
  message: string;
}

export function validateDataUseConsent(
  consent: DataUseConsent,
): ConsentValidationIssue[] {
  const issues: ConsentValidationIssue[] = [];
  requireText(issues, "id", consent.id);
  requireText(issues, "projectId", consent.projectId);
  requireText(issues, "subjectId", consent.subjectId);
  requireText(issues, "policyVersion", consent.policyVersion);
  requireDate(issues, "acceptedAt", consent.acceptedAt);

  if (!consent.purposes.includes("project-operation")) {
    issues.push({
      path: "purposes",
      message: "A operação do projeto precisa constar nas finalidades aceitas.",
    });
  }

  if (consent.status === "withdrawn") {
    requireDate(issues, "withdrawnAt", consent.withdrawnAt ?? "");
  }

  return issues;
}

export function canUseProjectData(
  consent: DataUseConsent,
  purpose: DataUsePurpose,
): boolean {
  return consent.status === "active" && consent.purposes.includes(purpose);
}

function requireText(
  issues: ConsentValidationIssue[],
  path: string,
  value: string,
) {
  if (value.trim().length === 0) {
    issues.push({ path, message: "Informe um texto não vazio." });
  }
}

function requireDate(
  issues: ConsentValidationIssue[],
  path: string,
  value: string,
) {
  if (Number.isNaN(Date.parse(value))) {
    issues.push({ path, message: "Informe uma data válida." });
  }
}

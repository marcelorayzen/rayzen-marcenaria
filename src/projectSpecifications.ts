/**
 * Project-specific specifications deliberately avoid a universal furniture
 * catalog. A source such as Promob can inform a specification, but it never
 * becomes a silent technical rule or production release.
 */
export type SpecificationSourceKind =
  | "promob"
  | "sketchup"
  | "document"
  | "customer"
  | "field"
  | "manual"
  | "import";

export type SpecificationValue = string | number | boolean;
export type SpecificationStatus = "proposed" | "confirmed";
export type SpecificationProposalStatus = "proposed" | "accepted" | "rejected";

export interface ProjectSpecification {
  id: string;
  scopeId: string;
  label: string;
  value: SpecificationValue;
  status: SpecificationStatus;
  source: {
    kind: SpecificationSourceKind;
    referenceId: string;
  };
}

export interface SpecificationChangeProposal {
  id: string;
  specificationId: string;
  baseRevisionId: string;
  proposedValue: SpecificationValue;
  reason: string;
  proposedBy: "internal" | "assistant";
  status: SpecificationProposalStatus;
  decidedBy?: string;
  decidedAt?: string;
}

export interface SpecificationValidationIssue {
  path: string;
  message: string;
}

export function validateProjectSpecifications(
  specifications: ProjectSpecification[],
): SpecificationValidationIssue[] {
  const issues: SpecificationValidationIssue[] = [];
  const ids = new Set<string>();

  for (const [index, specification] of specifications.entries()) {
    const path = `specifications[${index}]`;
    requireUniqueText(issues, ids, `${path}.id`, specification.id);
    requireText(issues, `${path}.scopeId`, specification.scopeId);
    requireText(issues, `${path}.label`, specification.label);
    requireText(issues, `${path}.source.referenceId`, specification.source.referenceId);
    if (typeof specification.value === "number" && !Number.isFinite(specification.value)) {
      issues.push({
        path: `${path}.value`,
        message: "O valor numérico precisa ser finito.",
      });
    }
  }

  return issues;
}

export function validateSpecificationChangeProposal(
  proposal: SpecificationChangeProposal,
  specifications: ProjectSpecification[],
): SpecificationValidationIssue[] {
  const issues: SpecificationValidationIssue[] = [];
  requireText(issues, "id", proposal.id);
  requireText(issues, "baseRevisionId", proposal.baseRevisionId);
  requireText(issues, "reason", proposal.reason);

  if (!specifications.some((specification) => specification.id === proposal.specificationId)) {
    issues.push({
      path: "specificationId",
      message: "A proposta precisa apontar para uma especificação existente.",
    });
  }

  if (typeof proposal.proposedValue === "number" && !Number.isFinite(proposal.proposedValue)) {
    issues.push({
      path: "proposedValue",
      message: "O valor numérico proposto precisa ser finito.",
    });
  }

  if (proposal.status !== "proposed") {
    requireText(issues, "decidedBy", proposal.decidedBy ?? "");
    requireDate(issues, "decidedAt", proposal.decidedAt ?? "");
  }

  return issues;
}

function requireUniqueText(
  issues: SpecificationValidationIssue[],
  ids: Set<string>,
  path: string,
  value: string,
) {
  requireText(issues, path, value);
  if (ids.has(value)) {
    issues.push({ path, message: "O identificador precisa ser único." });
  }
  ids.add(value);
}

function requireText(
  issues: SpecificationValidationIssue[],
  path: string,
  value: string,
) {
  if (value.trim().length === 0) {
    issues.push({ path, message: "Informe um texto não vazio." });
  }
}

function requireDate(
  issues: SpecificationValidationIssue[],
  path: string,
  value: string,
) {
  if (Number.isNaN(Date.parse(value))) {
    issues.push({ path, message: "Informe uma data válida." });
  }
}

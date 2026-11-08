import {
  createCounterModel,
  validateCounter,
  type CounterModel,
  type CounterParameters,
} from "./furnitureEngine";

export type CounterDimensionField = keyof CounterParameters;

export interface SetCounterDimensionProposal {
  operation: "set-counter-dimension";
  baseRevisionId: string;
  field: CounterDimensionField;
  currentValue: number;
  proposedValue: number;
  unit: "mm";
  reason: string;
  proposedBy: "internal" | "assistant";
}

export interface ProposalValidationIssue {
  path: string;
  message: string;
}

export interface CounterChangePreview {
  before: CounterModel;
  after: CounterModel;
}

export function validateSetCounterDimensionProposal(
  proposal: SetCounterDimensionProposal,
  baseParameters: CounterParameters,
): ProposalValidationIssue[] {
  const issues: ProposalValidationIssue[] = [];

  if (proposal.baseRevisionId.trim().length === 0) {
    issues.push({ path: "baseRevisionId", message: "Informe a revisão-base." });
  }
  if (proposal.reason.trim().length === 0) {
    issues.push({ path: "reason", message: "Explique a alteração proposta." });
  }
  if (proposal.currentValue !== baseParameters[proposal.field]) {
    issues.push({
      path: "currentValue",
      message: "O valor atual não corresponde à revisão-base.",
    });
  }
  if (!Number.isFinite(proposal.proposedValue)) {
    issues.push({
      path: "proposedValue",
      message: "Informe uma medida finita.",
    });
    return issues;
  }

  const candidate = { ...baseParameters, [proposal.field]: proposal.proposedValue };
  for (const issue of validateCounter(candidate)) {
    issues.push({ path: `proposedValue.${issue.field}`, message: issue.message });
  }

  return issues;
}

export function previewSetCounterDimensionProposal(
  proposal: SetCounterDimensionProposal,
  baseParameters: CounterParameters,
): CounterChangePreview {
  const issues = validateSetCounterDimensionProposal(proposal, baseParameters);
  if (issues.length > 0) {
    throw new Error(issues.map((issue) => issue.message).join(" "));
  }

  const afterParameters = {
    ...baseParameters,
    [proposal.field]: proposal.proposedValue,
  };
  return {
    before: createCounterModel(baseParameters),
    after: createCounterModel(afterParameters),
  };
}

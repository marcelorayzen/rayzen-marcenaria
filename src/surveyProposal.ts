/**
 * Provider-agnostic contract for the first assistant task (decided 11/11/2026):
 * read visit photos and PROPOSE measurements, observations and pending items.
 *
 * The provider output is untrusted JSON. It is parsed strictly, validated
 * against the exact base revision, and only records a person accepts are
 * applied — atomically, through validateProjectSnapshot. Nothing here invents
 * woodworking rules: a value read from a photo always enters as "estimated"
 * (backlog B2: no silent conversion of an estimate into a checked measurement).
 */
import {
  validateProjectSnapshot,
  type Measurement,
  type Observation,
  type PendingItem,
  type ProjectSnapshot,
} from "./projectDomain";

export const SURVEY_PROPOSAL_FORMAT = "rayzen-survey-proposal" as const;
export const SURVEY_PROPOSAL_VERSION = 1 as const;
export const MAX_SURVEY_OPERATIONS = 50;
export const MAX_SURVEY_TEXT = 500;

export interface ProposalSource {
  kind: "assistant";
  provider: string;
  model: string;
}

export type SurveyOperation =
  | {
      op: "add-measurement";
      tempId: string;
      label: string;
      value: number;
      unit: "mm";
      context: string;
      evidenceIds: string[];
    }
  | { op: "add-observation"; tempId: string; text: string; evidenceIds: string[] }
  | { op: "add-pending-item"; tempId: string; description: string; sourceRecordIds: string[] };

export interface SurveyProposalBatch {
  format: typeof SURVEY_PROPOSAL_FORMAT;
  formatVersion: typeof SURVEY_PROPOSAL_VERSION;
  baseRevisionId: string;
  source: ProposalSource;
  operations: SurveyOperation[];
}

export interface SurveyIssue {
  path: string;
  message: string;
}

export type SurveyParseResult =
  | { status: "valid"; batch: SurveyProposalBatch }
  | { status: "invalid"; issues: SurveyIssue[] };

/** JSON Schema for the operations list; adapters pass it as a tool/response schema. */
export const SURVEY_OPERATIONS_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["operations"],
  properties: {
    operations: {
      type: "array",
      maxItems: MAX_SURVEY_OPERATIONS,
      items: {
        oneOf: [
          {
            type: "object",
            additionalProperties: false,
            required: ["op", "tempId", "label", "value", "unit", "context", "evidenceIds"],
            properties: {
              op: { const: "add-measurement" },
              tempId: { type: "string" },
              label: { type: "string", maxLength: MAX_SURVEY_TEXT },
              value: { type: "number", exclusiveMinimum: 0 },
              unit: { const: "mm" },
              context: { type: "string", maxLength: MAX_SURVEY_TEXT },
              evidenceIds: { type: "array", minItems: 1, items: { type: "string" } },
            },
          },
          {
            type: "object",
            additionalProperties: false,
            required: ["op", "tempId", "text", "evidenceIds"],
            properties: {
              op: { const: "add-observation" },
              tempId: { type: "string" },
              text: { type: "string", maxLength: MAX_SURVEY_TEXT },
              evidenceIds: { type: "array", minItems: 1, items: { type: "string" } },
            },
          },
          {
            type: "object",
            additionalProperties: false,
            required: ["op", "tempId", "description", "sourceRecordIds"],
            properties: {
              op: { const: "add-pending-item" },
              tempId: { type: "string" },
              description: { type: "string", maxLength: MAX_SURVEY_TEXT },
              sourceRecordIds: { type: "array", minItems: 1, items: { type: "string" } },
            },
          },
        ],
      },
    },
  },
} as const;

const TEMP_ID = /^[a-z0-9][a-z0-9-]{0,63}$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function text(issues: SurveyIssue[], path: string, value: unknown): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    issues.push({ path, message: "Informe um texto não vazio." });
    return "";
  }
  if (value.length > MAX_SURVEY_TEXT) {
    issues.push({ path, message: `Use no máximo ${MAX_SURVEY_TEXT} caracteres.` });
  }
  return value.trim();
}

function ids(issues: SurveyIssue[], path: string, value: unknown): string[] {
  if (!Array.isArray(value) || value.length === 0 || !value.every(id => typeof id === "string" && id.length > 0)) {
    issues.push({ path, message: "Informe ao menos um identificador de origem." });
    return [];
  }
  return [...new Set(value as string[])];
}

/** Strictly parses untrusted provider output into a typed batch. */
export function parseSurveyProposal(raw: unknown): SurveyParseResult {
  const issues: SurveyIssue[] = [];
  if (!isRecord(raw)) return { status: "invalid", issues: [{ path: "", message: "A proposta precisa ser um objeto." }] };
  if (raw.format !== SURVEY_PROPOSAL_FORMAT || raw.formatVersion !== SURVEY_PROPOSAL_VERSION) {
    issues.push({ path: "format", message: "Formato de proposta desconhecido." });
  }
  const baseRevisionId = text(issues, "baseRevisionId", raw.baseRevisionId);
  const source = raw.source;
  if (!isRecord(source) || source.kind !== "assistant") {
    issues.push({ path: "source", message: "Identifique o assistente que gerou a proposta." });
  }
  const provider = text(issues, "source.provider", isRecord(source) ? source.provider : undefined);
  const model = text(issues, "source.model", isRecord(source) ? source.model : undefined);

  const operations: SurveyOperation[] = [];
  if (!Array.isArray(raw.operations) || raw.operations.length === 0) {
    issues.push({ path: "operations", message: "A proposta não contém operações." });
  } else if (raw.operations.length > MAX_SURVEY_OPERATIONS) {
    issues.push({ path: "operations", message: `Uma proposta aceita no máximo ${MAX_SURVEY_OPERATIONS} operações.` });
  } else {
    for (const [index, item] of raw.operations.entries()) {
      const path = `operations[${index}]`;
      if (!isRecord(item)) {
        issues.push({ path, message: "Operação inválida." });
        continue;
      }
      const tempId = typeof item.tempId === "string" && TEMP_ID.test(item.tempId) ? item.tempId : "";
      if (!tempId) issues.push({ path: `${path}.tempId`, message: "Identificador temporário inválido." });
      if (item.op === "add-measurement") {
        const value = item.value;
        if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
          issues.push({ path: `${path}.value`, message: "Informe uma medida maior que zero." });
        }
        if (item.unit !== "mm") issues.push({ path: `${path}.unit`, message: "A unidade precisa ser mm." });
        operations.push({
          op: "add-measurement", tempId,
          label: text(issues, `${path}.label`, item.label),
          value: typeof value === "number" ? value : Number.NaN,
          unit: "mm",
          context: text(issues, `${path}.context`, item.context),
          evidenceIds: ids(issues, `${path}.evidenceIds`, item.evidenceIds),
        });
      } else if (item.op === "add-observation") {
        operations.push({
          op: "add-observation", tempId,
          text: text(issues, `${path}.text`, item.text),
          evidenceIds: ids(issues, `${path}.evidenceIds`, item.evidenceIds),
        });
      } else if (item.op === "add-pending-item") {
        operations.push({
          op: "add-pending-item", tempId,
          description: text(issues, `${path}.description`, item.description),
          sourceRecordIds: ids(issues, `${path}.sourceRecordIds`, item.sourceRecordIds),
        });
      } else {
        issues.push({ path: `${path}.op`, message: "Operação não permitida." });
      }
    }
  }

  if (issues.length > 0) return { status: "invalid", issues };
  return {
    status: "valid",
    batch: {
      format: SURVEY_PROPOSAL_FORMAT,
      formatVersion: SURVEY_PROPOSAL_VERSION,
      baseRevisionId,
      source: { kind: "assistant", provider, model },
      operations,
    },
  };
}

function existingRecordIds(snapshot: ProjectSnapshot): Set<string> {
  return new Set([
    ...snapshot.evidence.map(item => item.id),
    ...snapshot.measurements.map(item => item.id),
    ...snapshot.observations.map(item => item.id),
    ...snapshot.pendingItems.map(item => item.id),
    ...snapshot.physicalConstraints.map(item => item.id),
  ]);
}

/** Checks references against the exact base snapshot. */
export function validateSurveyProposal(batch: SurveyProposalBatch, snapshot: ProjectSnapshot): SurveyIssue[] {
  const issues: SurveyIssue[] = [];
  if (batch.baseRevisionId !== snapshot.revision.id) {
    issues.push({ path: "baseRevisionId", message: "A proposta foi feita para outra revisão." });
  }
  const photos = new Set(snapshot.evidence.filter(item => item.kind === "photo").map(item => item.id));
  const existing = existingRecordIds(snapshot);
  const tempIds = new Set<string>();
  for (const [index, operation] of batch.operations.entries()) {
    const path = `operations[${index}]`;
    if (tempIds.has(operation.tempId) || existing.has(operation.tempId)) {
      issues.push({ path: `${path}.tempId`, message: "Identificador temporário repetido." });
    }
    tempIds.add(operation.tempId);
  }
  for (const [index, operation] of batch.operations.entries()) {
    const path = `operations[${index}]`;
    if (operation.op === "add-pending-item") {
      for (const id of operation.sourceRecordIds) {
        if (!existing.has(id) && !tempIds.has(id)) {
          issues.push({ path: `${path}.sourceRecordIds`, message: `Origem desconhecida: ${id}.` });
        }
      }
    } else {
      for (const id of operation.evidenceIds) {
        if (!photos.has(id)) {
          issues.push({ path: `${path}.evidenceIds`, message: `A foto ${id} não pertence a esta revisão.` });
        }
      }
    }
  }
  return issues;
}

export type SurveyDecision = "accept" | "reject";

export type SurveyApplyResult =
  | { status: "applied"; snapshot: ProjectSnapshot; acceptedCount: number }
  | { status: "invalid"; issues: SurveyIssue[] };

export interface SurveyApplyContext {
  acceptedBy: string;
  acceptedAt: string;
  newId: (tempId: string) => string;
}

/**
 * Applies the accepted operations as one change. Rejected items are dropped;
 * an accepted pending item cannot cite a rejected proposal. Any validation
 * issue leaves the snapshot untouched (no partial success).
 */
export function applySurveyProposal(
  snapshot: ProjectSnapshot,
  batch: SurveyProposalBatch,
  decisions: Record<string, SurveyDecision>,
  context: SurveyApplyContext,
): SurveyApplyResult {
  const issues = validateSurveyProposal(batch, snapshot);
  for (const [index, operation] of batch.operations.entries()) {
    if (decisions[operation.tempId] === undefined) {
      issues.push({ path: `operations[${index}]`, message: "Aceite ou rejeite cada item antes de aplicar." });
    }
  }
  if (issues.length > 0) return { status: "invalid", issues };

  const accepted = batch.operations.filter(operation => decisions[operation.tempId] === "accept");
  if (accepted.length === 0) return { status: "invalid", issues: [{ path: "operations", message: "Nenhum item foi aceito." }] };

  const idMap = new Map(accepted.map(operation => [operation.tempId, context.newId(operation.tempId)]));
  const rejected = new Set(batch.operations.filter(op => decisions[op.tempId] === "reject").map(op => op.tempId));
  const attribution = {
    origin: "field" as const,
    recordedBy: context.acceptedBy,
    recordedAt: context.acceptedAt,
    confidence: "estimated" as const,
    proposedBy: batch.source,
  };

  const measurements: Measurement[] = [];
  const observations: Observation[] = [];
  const pendingItems: PendingItem[] = [];
  for (const [index, operation] of batch.operations.entries()) {
    if (decisions[operation.tempId] !== "accept") continue;
    const id = idMap.get(operation.tempId)!;
    if (operation.op === "add-measurement") {
      measurements.push({
        id, label: operation.label, value: operation.value, unit: "mm",
        context: operation.context, attribution, evidenceIds: operation.evidenceIds,
      });
    } else if (operation.op === "add-observation") {
      observations.push({ id, text: operation.text, attribution, evidenceIds: operation.evidenceIds });
    } else {
      const blocked = operation.sourceRecordIds.filter(source => rejected.has(source));
      if (blocked.length > 0) {
        issues.push({
          path: `operations[${index}].sourceRecordIds`,
          message: `A pendência depende de item rejeitado: ${blocked.join(", ")}.`,
        });
        continue;
      }
      pendingItems.push({
        id, description: operation.description, attribution,
        sourceRecordIds: operation.sourceRecordIds.map(source => idMap.get(source) ?? source),
      });
    }
  }
  if (issues.length > 0) return { status: "invalid", issues };

  const next: ProjectSnapshot = {
    ...snapshot,
    measurements: [...snapshot.measurements, ...measurements],
    observations: [...snapshot.observations, ...observations],
    pendingItems: [...snapshot.pendingItems, ...pendingItems],
  };
  const domainIssues = validateProjectSnapshot(next);
  if (domainIssues.length > 0) return { status: "invalid", issues: domainIssues };
  return { status: "applied", snapshot: next, acceptedCount: accepted.length };
}

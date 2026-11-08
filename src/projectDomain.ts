/**
 * Versioned, UI-independent contract for the first project flow.
 *
 * It intentionally records facts and their provenance without introducing
 * manufacturing rules. Geometry engines and persistence adapters consume this
 * contract in later phases.
 */
export const PROJECT_SCHEMA_VERSION = 1 as const;

export type MeasurementConfidence =
  | "informed"
  | "observed"
  | "estimated"
  | "measured";

export type RecordOrigin = "customer" | "field" | "document" | "import";

export type EvidenceKind = "photo" | "document" | "cad" | "csv";

export type PhysicalConstraintKind =
  | "plumbing-outlet"
  | "sink-bracket"
  | "electrical-point"
  | "pillar"
  | "opening"
  | "other";

export type DraftSyncState =
  | "local-only"
  | "sync-pending"
  | "synced"
  | "conflict"
  | "sync-failed";

/**
 * Metadata for a locally captured draft. A conflict is represented explicitly
 * so a future synchronizer cannot silently choose which revision wins.
 */
export interface DraftSynchronization {
  state: DraftSyncState;
  baseRevisionId?: string;
  lastSyncedAt?: string;
  failureMessage?: string;
}

export interface RecordAttribution {
  origin: RecordOrigin;
  recordedBy: string;
  recordedAt: string;
  confidence: MeasurementConfidence;
}

export interface Evidence {
  id: string;
  kind: EvidenceKind;
  label: string;
  attribution: RecordAttribution;
}

export interface Measurement {
  id: string;
  label: string;
  value: number;
  unit: "mm";
  context: string;
  attribution: RecordAttribution;
  evidenceIds: string[];
}

export interface Observation {
  id: string;
  text: string;
  attribution: RecordAttribution;
  evidenceIds: string[];
}

export interface PendingItem {
  id: string;
  description: string;
  attribution: RecordAttribution;
  sourceRecordIds: string[];
  resolvedByRecordId?: string;
}

export interface Dimension {
  label: string;
  value: number;
  unit: "mm";
}

export interface PhysicalConstraint {
  id: string;
  wallId?: string;
  kind: PhysicalConstraintKind;
  label: string;
  position: {
    x: number;
    y: number;
    reference: string;
  };
  dimensions: Dimension[];
  attribution: RecordAttribution;
  sourceRecordIds: string[];
}

/**
 * A wall recorded for a 2D elevation. Its dimensions remain facts captured
 * during the visit; placement or collision decisions belong to later rules.
 */
export interface Wall {
  id: string;
  label: string;
  width: number;
  height: number;
  unit: "mm";
  attribution: RecordAttribution;
  sourceRecordIds: string[];
}

export interface CounterFurnitureInstance {
  id: string;
  kind: "counter";
  label: string;
  parameters: {
    width: number;
    height: number;
    depth: number;
    thickness: number;
  };
  placement?: WallPlacement;
  attribution: RecordAttribution;
}

export interface WallPlacement {
  wallId: string;
  x: number;
  y: number;
  reference: string;
}

export interface ProjectRevision {
  id: string;
  number: number;
  createdAt: string;
  baseRevisionId?: string;
}

export interface ProjectSnapshot {
  schemaVersion: typeof PROJECT_SCHEMA_VERSION;
  project: {
    id: string;
    title: string;
  };
  revision: ProjectRevision;
  evidence: Evidence[];
  measurements: Measurement[];
  observations: Observation[];
  pendingItems: PendingItem[];
  physicalConstraints: PhysicalConstraint[];
  walls?: Wall[];
  furniture: CounterFurnitureInstance[];
  specifications: ProjectSpecification[];
}

export interface DomainValidationIssue {
  path: string;
  message: string;
}

export function validateProjectSnapshot(
  snapshot: ProjectSnapshot,
): DomainValidationIssue[] {
  const issues: DomainValidationIssue[] = [];

  requireText(issues, "project.id", snapshot.project.id);
  requireText(issues, "project.title", snapshot.project.title);
  requireText(issues, "revision.id", snapshot.revision.id);
  requirePositiveInteger(issues, "revision.number", snapshot.revision.number);
  requireDate(issues, "revision.createdAt", snapshot.revision.createdAt);

  const evidenceIds = new Set<string>();
  for (const [index, evidence] of snapshot.evidence.entries()) {
    const path = `evidence[${index}]`;
    requireUniqueId(issues, evidenceIds, `${path}.id`, evidence.id);
    requireText(issues, `${path}.label`, evidence.label);
    validateAttribution(issues, `${path}.attribution`, evidence.attribution);
  }

  const recordIds = new Set<string>(evidenceIds);
  for (const [index, measurement] of snapshot.measurements.entries()) {
    const path = `measurements[${index}]`;
    requireUniqueId(issues, recordIds, `${path}.id`, measurement.id);
    requireText(issues, `${path}.label`, measurement.label);
    requirePositiveNumber(issues, `${path}.value`, measurement.value);
    requireText(issues, `${path}.context`, measurement.context);
    validateAttribution(issues, `${path}.attribution`, measurement.attribution);
    validateKnownEvidenceIds(issues, `${path}.evidenceIds`, measurement.evidenceIds, evidenceIds);
  }

  for (const [index, observation] of snapshot.observations.entries()) {
    const path = `observations[${index}]`;
    requireUniqueId(issues, recordIds, `${path}.id`, observation.id);
    requireText(issues, `${path}.text`, observation.text);
    validateAttribution(issues, `${path}.attribution`, observation.attribution);
    validateKnownEvidenceIds(issues, `${path}.evidenceIds`, observation.evidenceIds, evidenceIds);
  }

  const wallIds = new Set<string>();
  for (const [index, wall] of (snapshot.walls ?? []).entries()) {
    const path = `walls[${index}]`;
    requireUniqueId(issues, wallIds, `${path}.id`, wall.id);
    requireText(issues, `${path}.label`, wall.label);
    requirePositiveNumber(issues, `${path}.width`, wall.width);
    requirePositiveNumber(issues, `${path}.height`, wall.height);
    validateAttribution(issues, `${path}.attribution`, wall.attribution);
    requireKnownRecordIds(issues, `${path}.sourceRecordIds`, wall.sourceRecordIds, recordIds);
  }

  for (const [index, pendingItem] of snapshot.pendingItems.entries()) {
    const path = `pendingItems[${index}]`;
    requireUniqueId(issues, recordIds, `${path}.id`, pendingItem.id);
    requireText(issues, `${path}.description`, pendingItem.description);
    validateAttribution(issues, `${path}.attribution`, pendingItem.attribution);
    requireKnownRecordIds(issues, `${path}.sourceRecordIds`, pendingItem.sourceRecordIds, recordIds);
    if (
      pendingItem.resolvedByRecordId !== undefined &&
      !recordIds.has(pendingItem.resolvedByRecordId)
    ) {
      issues.push({
        path: `${path}.resolvedByRecordId`,
        message: "A resolução precisa apontar para um registro existente.",
      });
    }
  }

  for (const [index, constraint] of snapshot.physicalConstraints.entries()) {
    const path = `physicalConstraints[${index}]`;
    requireUniqueId(issues, recordIds, `${path}.id`, constraint.id);
    requireText(issues, `${path}.label`, constraint.label);
    requireFiniteNumber(issues, `${path}.position.x`, constraint.position.x);
    requireFiniteNumber(issues, `${path}.position.y`, constraint.position.y);
    requireText(issues, `${path}.position.reference`, constraint.position.reference);
    validateAttribution(issues, `${path}.attribution`, constraint.attribution);
    requireKnownRecordIds(issues, `${path}.sourceRecordIds`, constraint.sourceRecordIds, recordIds);
    if (constraint.wallId !== undefined && !wallIds.has(constraint.wallId)) {
      issues.push({
        path: `${path}.wallId`,
        message: "A parede selecionada não existe no snapshot.",
      });
    }

    if (constraint.dimensions.length === 0) {
      issues.push({
        path: `${path}.dimensions`,
        message: "A interferência precisa ter ao menos uma dimensão declarada.",
      });
    }
    for (const [dimensionIndex, dimension] of constraint.dimensions.entries()) {
      requireText(issues, `${path}.dimensions[${dimensionIndex}].label`, dimension.label);
      requirePositiveNumber(
        issues,
        `${path}.dimensions[${dimensionIndex}].value`,
        dimension.value,
      );
    }
  }

  const furnitureIds = new Set<string>();
  for (const [index, furniture] of snapshot.furniture.entries()) {
    const path = `furniture[${index}]`;
    requireUniqueId(issues, furnitureIds, `${path}.id`, furniture.id);
    requireText(issues, `${path}.label`, furniture.label);
    validateAttribution(issues, `${path}.attribution`, furniture.attribution);
    if (furniture.placement !== undefined) {
      if (!wallIds.has(furniture.placement.wallId)) {
        issues.push({
          path: `${path}.placement.wallId`,
          message: "A parede selecionada não existe no snapshot.",
        });
      }
      requireFiniteNumber(issues, `${path}.placement.x`, furniture.placement.x);
      requireFiniteNumber(issues, `${path}.placement.y`, furniture.placement.y);
      requireText(issues, `${path}.placement.reference`, furniture.placement.reference);
    }
    for (const [field, value] of Object.entries(furniture.parameters)) {
      requirePositiveNumber(issues, `${path}.parameters.${field}`, value);
    }
    if (furniture.parameters.width <= furniture.parameters.thickness * 2) {
      issues.push({
        path: `${path}.parameters.width`,
        message: "A largura precisa comportar as duas laterais.",
      });
    }
    if (furniture.parameters.height <= furniture.parameters.thickness) {
      issues.push({
        path: `${path}.parameters.height`,
        message: "A altura precisa comportar a espessura das peças.",
      });
    }
  }

  issues.push(...validateProjectSpecifications(snapshot.specifications));

  return issues;
}

export function validateDraftSynchronization(
  synchronization: DraftSynchronization,
): DomainValidationIssue[] {
  const issues: DomainValidationIssue[] = [];

  if (
    (synchronization.state === "conflict" ||
      synchronization.state === "sync-pending") &&
    (synchronization.baseRevisionId === undefined ||
      synchronization.baseRevisionId.trim().length === 0)
  ) {
    issues.push({
      path: "baseRevisionId",
      message: "Informe a revisão-base para sincronizar ou resolver conflito.",
    });
  }

  if (
    synchronization.lastSyncedAt !== undefined &&
    Number.isNaN(Date.parse(synchronization.lastSyncedAt))
  ) {
    issues.push({
      path: "lastSyncedAt",
      message: "Informe a data da última sincronização válida.",
    });
  }

  if (
    synchronization.state === "sync-failed" &&
    (synchronization.failureMessage === undefined ||
      synchronization.failureMessage.trim().length === 0)
  ) {
    issues.push({
      path: "failureMessage",
      message: "Explique a falha de sincronização para orientar a pessoa usuária.",
    });
  }

  return issues;
}

function validateAttribution(
  issues: DomainValidationIssue[],
  path: string,
  attribution: RecordAttribution,
) {
  requireText(issues, `${path}.recordedBy`, attribution.recordedBy);
  requireDate(issues, `${path}.recordedAt`, attribution.recordedAt);
}

function requireText(
  issues: DomainValidationIssue[],
  path: string,
  value: string,
) {
  if (value.trim().length === 0) {
    issues.push({ path, message: "Informe um texto não vazio." });
  }
}

function requireDate(
  issues: DomainValidationIssue[],
  path: string,
  value: string,
) {
  if (Number.isNaN(Date.parse(value))) {
    issues.push({ path, message: "Informe uma data válida." });
  }
}

function requireFiniteNumber(
  issues: DomainValidationIssue[],
  path: string,
  value: number,
) {
  if (!Number.isFinite(value)) {
    issues.push({ path, message: "Informe um número finito." });
  }
}

function requirePositiveNumber(
  issues: DomainValidationIssue[],
  path: string,
  value: number,
) {
  if (!Number.isFinite(value) || value <= 0) {
    issues.push({ path, message: "Informe um número maior que zero." });
  }
}

function requirePositiveInteger(
  issues: DomainValidationIssue[],
  path: string,
  value: number,
) {
  if (!Number.isInteger(value) || value <= 0) {
    issues.push({ path, message: "Informe um número inteiro maior que zero." });
  }
}

function requireUniqueId(
  issues: DomainValidationIssue[],
  knownIds: Set<string>,
  path: string,
  id: string,
) {
  requireText(issues, path, id);
  if (knownIds.has(id)) {
    issues.push({ path, message: "O identificador precisa ser único no snapshot." });
  }
  knownIds.add(id);
}

function validateKnownEvidenceIds(
  issues: DomainValidationIssue[],
  path: string,
  ids: string[],
  knownIds: Set<string>,
) {
  for (const [index, id] of ids.entries()) {
    if (!knownIds.has(id)) {
      issues.push({
        path: `${path}[${index}]`,
        message: "A evidência referenciada não existe no snapshot.",
      });
    }
  }
}

function requireKnownRecordIds(
  issues: DomainValidationIssue[],
  path: string,
  ids: string[],
  knownIds: Set<string>,
) {
  if (ids.length === 0) {
    issues.push({ path, message: "Informe ao menos um registro de origem." });
  }
  for (const [index, id] of ids.entries()) {
    if (!knownIds.has(id)) {
      issues.push({
        path: `${path}[${index}]`,
        message: "O registro de origem não existe no snapshot.",
      });
    }
  }
}
import {
  type ProjectSpecification,
  validateProjectSpecifications,
} from "./projectSpecifications";


import { Canvas, useThree } from "@react-three/fiber";
import { type ChangeEvent, Suspense, useEffect, useMemo, useRef, useState } from "react";
import {
  createCounterModel,
  createPartsCsv,
  validateCounter,
  type CounterParameters,
  type Part,
} from "./furnitureEngine";
import type {
  Measurement,
  MeasurementConfidence,
  Observation,
  PendingItem,
  PhysicalConstraint,
  ProjectSnapshot,
  Wall,
  WallPlacement,
} from "./projectDomain";
import { InMemoryProjectRepository } from "./projectRepository";
import { BrowserProjectStorage } from "./browserProjectStorage";
import type { ProjectSpecification, SpecificationSourceKind } from "./projectSpecifications";
import {
  previewSetCounterDimensionProposal,
  validateSetCounterDimensionProposal,
  type SetCounterDimensionProposal,
} from "./counterChangeProposal";
import {
  findConstraintsInsideFurniture,
  projectConstraintsOnWall,
  projectFurnitureOnWall,
} from "./wallElevation";
import { getProjectChecks } from "./projectChecks";
import {
  type LocalProjectBackup,
  validateLocalProjectBackup,
} from "./projectBackup";
import { getDraftSynchronizationPresentation } from "./draftSynchronization";
import { AuthPanel, type AuthUser } from "./AuthPanel";
import { isSupabaseConfigured } from "./supabaseClient";
import { getRoleCapabilities } from "./roleCapabilities";
import { supabase } from "./supabaseClient";
import {
  BrowserDraftSyncQueue,
  enqueueDraftSync,
  markDraftSyncConflict,
  markDraftSyncFailed,
  markDraftSyncing,
  markDraftSynced,
  type DraftSyncQueueItem,
} from "./draftSyncQueue";
import { syncDraftQueueItem } from "./supabaseDraftSync";
import { parseProjectChatMessage } from "./projectChat";
import "./scene.css";

type ViewMode = "isometric" | "front" | "side" | "top";

const initialParameters: CounterParameters = {
  width: 800,
  height: 720,
  depth: 500,
  thickness: 18,
};

function formatRevisionTimestamp(date: Date): string {
  const datePart = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
  }).format(date);
  const timePart = new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
  return `${datePart} · ${timePart}`;
}

interface Revision {
  id: string;
  number: number;
  savedAt: string;
  parameters: CounterParameters;
  measurements: Measurement[];
  observations: Observation[];
  pendingItems: PendingItem[];
  physicalConstraints: PhysicalConstraint[];
  walls: Wall[];
  counterPlacement?: WallPlacement;
  specifications: ProjectSpecification[];
}

const demoProject = {
  id: "demo-counter-project",
  title: "Balcão de ensaio",
};
const demoStorageKey = "rayzen-marcenaria:demo-counter:v1";
const syncQueueStorageKey = "rayzen-marcenaria:demo-counter:sync-queue:v1";
const projectMetaStorageKey = "rayzen-marcenaria:active-project:v1";

function createDemoSnapshot(
  parameters: CounterParameters,
  number: number,
  createdAt: string,
  measurements: Measurement[] = [],
  observations: Observation[] = [],
  pendingItems: PendingItem[] = [],
  physicalConstraints: PhysicalConstraint[] = [],
  specifications: ProjectSpecification[] = [],
  walls: Wall[] = [],
  counterPlacement?: WallPlacement,
): ProjectSnapshot {
  return {
    schemaVersion: 1,
    project: demoProject,
    revision: {
      id: `demo-counter-revision-${number}`,
      number,
      createdAt,
    },
    evidence: [],
    measurements: measurements.map((measurement) => ({ ...measurement })),
    observations: observations.map((observation) => ({
      ...observation,
      evidenceIds: [...observation.evidenceIds],
    })),
    pendingItems: pendingItems.map((item) => ({
      ...item,
      sourceRecordIds: [...item.sourceRecordIds],
    })),
    physicalConstraints: physicalConstraints.map((constraint) => ({
      ...constraint,
      position: { ...constraint.position },
      dimensions: constraint.dimensions.map((dimension) => ({ ...dimension })),
      sourceRecordIds: [...constraint.sourceRecordIds],
    })),
    walls: walls.map((wall) => ({
      ...wall,
      sourceRecordIds: [...wall.sourceRecordIds],
    })),
    furniture: [
      {
        id: "demo-counter",
        kind: "counter",
        label: "Balcão de ensaio",
        parameters: { ...parameters },
        placement: counterPlacement ? { ...counterPlacement } : undefined,
        attribution: {
          origin: "document",
          recordedBy: "demonstracao-local",
          recordedAt: createdAt,
          confidence: "estimated",
        },
      },
    ],
    specifications: specifications.map((specification) => ({
      ...specification,
      source: { ...specification.source },
    })),
  };
}

function revisionFromSnapshot(snapshot: ProjectSnapshot): Revision {
  const counter = snapshot.furniture.find(
    (furniture) => furniture.id === "demo-counter",
  );
  if (counter === undefined) {
    throw new Error("A revisão de demonstração não contém o balcão.");
  }

  return {
    id: snapshot.revision.id,
    number: snapshot.revision.number,
    savedAt: formatRevisionTimestamp(new Date(snapshot.revision.createdAt)),
    parameters: { ...counter.parameters },
    measurements: snapshot.measurements.map((measurement) => ({ ...measurement })),
    observations: snapshot.observations.map((observation) => ({
      ...observation,
      evidenceIds: [...observation.evidenceIds],
    })),
    pendingItems: snapshot.pendingItems.map((item) => ({
      ...item,
      sourceRecordIds: [...item.sourceRecordIds],
    })),
    physicalConstraints: snapshot.physicalConstraints.map((constraint) => ({
      ...constraint,
      position: { ...constraint.position },
      dimensions: constraint.dimensions.map((dimension) => ({ ...dimension })),
      sourceRecordIds: [...constraint.sourceRecordIds],
    })),
    walls: (snapshot.walls ?? []).map((wall) => ({
      ...wall,
      sourceRecordIds: [...wall.sourceRecordIds],
    })),
    counterPlacement: counter.placement ? { ...counter.placement } : undefined,
    specifications: snapshot.specifications.map((specification) => ({
      ...specification,
      source: { ...specification.source },
    })),
  };
}

function createDemoRepository(): InMemoryProjectRepository {
  const repository = new InMemoryProjectRepository();
  const storedMeta = window.localStorage.getItem(projectMetaStorageKey);
  if (storedMeta !== null) {
    try {
      const meta = JSON.parse(storedMeta) as { id?: unknown; title?: unknown };
      if (typeof meta.id === "string" && meta.id.length > 0) demoProject.id = meta.id;
      if (typeof meta.title === "string" && meta.title.trim().length > 0) demoProject.title = meta.title;
    } catch {
      window.localStorage.removeItem(projectMetaStorageKey);
    }
  }
  const createdAt = new Date().toISOString();
  repository.createProject({
    ...demoProject,
    createdAt,
  });
  const storage = new BrowserProjectStorage(window.localStorage, demoStorageKey);
  const storedSnapshots = storage.load();
  try {
    for (const snapshot of storedSnapshots) {
      if (snapshot.project.id === demoProject.id) {
        repository.saveRevision(snapshot);
      }
    }
  } catch {
    storage.clear();
  }
  if (repository.listRevisions(demoProject.id).length === 0) {
    repository.saveRevision(createDemoSnapshot(initialParameters, 1, createdAt));
  }
  return repository;
}

function persistDemoRepository(repository: InMemoryProjectRepository) {
  new BrowserProjectStorage(window.localStorage, demoStorageKey).save(
    repository.listRevisions(demoProject.id),
  );
}

export default function App() {
  const repositoryRef = useRef<InMemoryProjectRepository | null>(null);
  if (repositoryRef.current === null) {
    repositoryRef.current = createDemoRepository();
  }
  const repository = repositoryRef.current;
  const [parameters, setParameters] =
    useState<CounterParameters>(initialParameters);
  const [revisions, setRevisions] = useState<Revision[]>(() =>
    repository.listRevisions(demoProject.id).map(revisionFromSnapshot),
  );
  const [view, setView] = useState<ViewMode>("isometric");
  const [selectedPart, setSelectedPart] = useState<string | null>(null);
  const [selectedConstraintId, setSelectedConstraintId] = useState<string | null>(null);
  const [proposedWidth, setProposedWidth] = useState("900");
  const [pendingProposal, setPendingProposal] =
    useState<SetCounterDimensionProposal | null>(null);
  const [proposalError, setProposalError] = useState<string | null>(null);
  const [measurementLabel, setMeasurementLabel] = useState("");
  const [measurementValue, setMeasurementValue] = useState("");
  const [measurementContext, setMeasurementContext] = useState("");
  const [measurementConfidence, setMeasurementConfidence] =
    useState<MeasurementConfidence>("measured");
  const [measurementResolvesPendingId, setMeasurementResolvesPendingId] = useState("");
  const [measurementError, setMeasurementError] = useState<string | null>(null);
  const [observationText, setObservationText] = useState("");
  const [observationConfidence, setObservationConfidence] = useState<MeasurementConfidence>("observed");
  const [observationError, setObservationError] = useState<string | null>(null);
  const [pendingDescription, setPendingDescription] = useState("");
  const [pendingSourceId, setPendingSourceId] = useState("");
  const [pendingError, setPendingError] = useState<string | null>(null);
  const [constraintKind, setConstraintKind] =
    useState<PhysicalConstraint["kind"]>("plumbing-outlet");
  const [constraintLabel, setConstraintLabel] = useState("");
  const [constraintX, setConstraintX] = useState("");
  const [constraintY, setConstraintY] = useState("");
  const [constraintDimensionLabel, setConstraintDimensionLabel] = useState("largura");
  const [constraintDimensionValue, setConstraintDimensionValue] = useState("");
  const [constraintSourceId, setConstraintSourceId] = useState("");
  const [constraintWallId, setConstraintWallId] = useState("");
  const [constraintError, setConstraintError] = useState<string | null>(null);
  const [wallLabel, setWallLabel] = useState("");
  const [wallWidth, setWallWidth] = useState("");
  const [wallHeight, setWallHeight] = useState("");
  const [wallSourceId, setWallSourceId] = useState("");
  const [wallConfidence, setWallConfidence] = useState<MeasurementConfidence>("measured");
  const [wallError, setWallError] = useState<string | null>(null);
  const [placementWallId, setPlacementWallId] = useState("");
  const [placementX, setPlacementX] = useState("");
  const [placementY, setPlacementY] = useState("");
  const [placementError, setPlacementError] = useState<string | null>(null);
  const [specificationLabel, setSpecificationLabel] = useState("");
  const [specificationValue, setSpecificationValue] = useState("");
  const [specificationSourceKind, setSpecificationSourceKind] =
    useState<SpecificationSourceKind>("promob");
  const [specificationSourceReference, setSpecificationSourceReference] = useState("");
  const [specificationError, setSpecificationError] = useState<string | null>(null);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [backupInspection, setBackupInspection] = useState<string | null>(null);
  const [restorableBackup, setRestorableBackup] = useState<LocalProjectBackup | null>(null);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [syncQueue, setSyncQueue] = useState<DraftSyncQueueItem[]>(() =>
    new BrowserDraftSyncQueue(window.localStorage, syncQueueStorageKey).load(),
  );
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [chatInput, setChatInput] = useState("");
  const [chatMessage, setChatMessage] = useState<string | null>(null);

  const issues = validateCounter(parameters);
  const model = useMemo(
    () => (issues.length === 0 ? createCounterModel(parameters) : null),
    [issues.length, parameters],
  );
  const savedRevision = revisions[revisions.length - 1]!;
  const latestSyncItem = syncQueue.find(
    (item) => item.revisionId === savedRevision.id,
  );
  const syncState = latestSyncItem?.status === "synced"
    ? "synced"
    : latestSyncItem?.status === "conflict"
      ? "conflict"
      : latestSyncItem?.status === "failed"
        ? "sync-failed"
        : latestSyncItem?.status === "syncing" || latestSyncItem?.status === "pending"
          ? "sync-pending"
          : "local-only";
  const draftSynchronization = getDraftSynchronizationPresentation(syncState);
  const projectChecks = useMemo(() => {
    const snapshots = repository.listRevisions(demoProject.id);
    return getProjectChecks(snapshots[snapshots.length - 1]!);
  }, [repository, revisions]);
  const isDirty =
    JSON.stringify(parameters) !== JSON.stringify(savedRevision.parameters);
  const selectedConstraint = savedRevision.physicalConstraints.find(
    (constraint) => constraint.id === selectedConstraintId,
  );
  const roleCapabilities = getRoleCapabilities(authUser?.roles ?? []);

  const pendingPreview = useMemo(
    () =>
      pendingProposal === null
        ? null
        : previewSetCounterDimensionProposal(pendingProposal, savedRevision.parameters),
    [pendingProposal, savedRevision.parameters],
  );

  if (isSupabaseConfigured && (authUser === null || !authUser.profileReady)) {
    return (
      <main className="auth-locked-page">
        <AuthPanel onUserChange={setAuthUser} />
        <section className="role-banner" aria-label="Papéis e permissões">
          <div>
            <span className="small-label">CONTEXTO DE TRABALHO</span>
            <strong>{authUser?.displayName ?? "Demonstração local"}</strong>
          </div>
          <div className="role-badges">
            {(authUser?.roles ?? []).length > 0 ? (authUser?.roles ?? []).map((role) => (
              <span key={role}>{role}</span>
            )) : <span>modo local</span>}
          </div>
          <p>
            {roleCapabilities.canValidateCommercial ? "Pode registrar validação comercial." : "Validação comercial fica com o representante."}{" "}
            {roleCapabilities.canReleaseProduction ? "Pode liberar tecnicamente quando o gate estiver implementado." : "Liberação técnica fica com o marceneiro."}
          </p>
        </section>
        <p>{authUser ? "Seu usuário foi autenticado, mas ainda não possui um perfil interno provisionado." : "Entre com uma conta da equipe para acessar o espaço de trabalho."}</p>
      </main>
    );
  }

  function updateParameter(field: keyof CounterParameters, rawValue: string) {
    const value = Number(rawValue);
    setParameters((current) => ({ ...current, [field]: value }));
  }

  function saveRevision() {
    if (issues.length > 0 || !isDirty) return;
    const nextNumber = savedRevision.number + 1;
    repository.saveRevision(
      createDemoSnapshot(
        parameters,
        nextNumber,
        new Date().toISOString(),
        savedRevision.measurements,
        savedRevision.observations,
        savedRevision.pendingItems,
        savedRevision.physicalConstraints,
        savedRevision.specifications,
        savedRevision.walls,
        savedRevision.counterPlacement,
      ),
    );
    persistDemoRepository(repository);
    setRevisions(
      repository.listRevisions(demoProject.id).map(revisionFromSnapshot),
    );
  }

  function previewWidthProposal() {
    if (isDirty) {
      setProposalError("Salve ou corrija o rascunho antes de propor uma alteração.");
      return;
    }

    const proposal: SetCounterDimensionProposal = {
      operation: "set-counter-dimension",
      baseRevisionId: savedRevision.id,
      field: "width",
      currentValue: savedRevision.parameters.width,
      proposedValue: Number(proposedWidth),
      unit: "mm",
      reason: "Alteração proposta no editor local.",
      proposedBy: "internal",
    };
    const proposalIssues = validateSetCounterDimensionProposal(
      proposal,
      savedRevision.parameters,
    );
    if (proposalIssues.length > 0) {
      setProposalError(proposalIssues[0]!.message);
      return;
    }

    setProposalError(null);
    setPendingProposal(proposal);
  }

  function submitProjectChat() {
    const command = parseProjectChatMessage(chatInput);
    if (command.kind === "unsupported") {
      setChatMessage(command.message);
      return;
    }
    const proposal: SetCounterDimensionProposal = {
      operation: "set-counter-dimension",
      baseRevisionId: savedRevision.id,
      field: "width",
      currentValue: savedRevision.parameters.width,
      proposedValue: command.value,
      unit: "mm",
      reason: "Proposta recebida pela conversa local.",
      proposedBy: "internal",
    };
    const proposalIssues = validateSetCounterDimensionProposal(proposal, savedRevision.parameters);
    if (proposalIssues.length > 0) {
      setChatMessage(proposalIssues[0]!.message);
      return;
    }
    setProposedWidth(String(command.value));
    setProposalError(null);
    setPendingProposal(proposal);
    setChatMessage("Preparei uma proposta. Revise o impacto e aceite somente se estiver correto.");
    setChatInput("");
  }

  function acceptProposal() {
    if (pendingProposal === null) return;
    const preview = previewSetCounterDimensionProposal(
      pendingProposal,
      savedRevision.parameters,
    );
    const nextNumber = savedRevision.number + 1;
    const nextParameters = preview.after.parameters;
    repository.saveRevision(
      createDemoSnapshot(
        nextParameters,
        nextNumber,
        new Date().toISOString(),
        savedRevision.measurements,
        savedRevision.observations,
        savedRevision.pendingItems,
        savedRevision.physicalConstraints,
        savedRevision.specifications,
        savedRevision.walls,
        savedRevision.counterPlacement,
      ),
    );
    persistDemoRepository(repository);
    setParameters(nextParameters);
    setRevisions(
      repository.listRevisions(demoProject.id).map(revisionFromSnapshot),
    );
    setPendingProposal(null);
    setProposalError(null);
  }

  function addMeasurement() {
    if (isDirty) {
      setMeasurementError("Salve ou corrija o rascunho antes de registrar uma medida.");
      return;
    }
    const value = Number(measurementValue);
    if (
      measurementLabel.trim().length === 0 ||
      measurementContext.trim().length === 0
    ) {
      setMeasurementError("Informe a medida e o contexto onde ela foi registrada.");
      return;
    }
    if (!Number.isFinite(value) || value <= 0) {
      setMeasurementError("Informe uma medida maior que zero.");
      return;
    }

    const recordedAt = new Date().toISOString();
    const newMeasurement: Measurement = {
      id: `demo-measurement-${savedRevision.measurements.length + 1}`,
      label: measurementLabel.trim(),
      value,
      unit: "mm",
      context: measurementContext.trim(),
      attribution: {
        origin: "field",
        recordedBy: "demonstracao-local",
        recordedAt,
        confidence: measurementConfidence,
      },
      evidenceIds: [],
    };
    const nextMeasurements: Measurement[] = [
      ...savedRevision.measurements,
      newMeasurement,
    ];
    const nextPendingItems = savedRevision.pendingItems.map((item) =>
      item.id === measurementResolvesPendingId
        ? { ...item, resolvedByRecordId: newMeasurement.id }
        : item,
    );
    const nextNumber = savedRevision.number + 1;
    repository.saveRevision(
      createDemoSnapshot(
        parameters,
        nextNumber,
        recordedAt,
        nextMeasurements,
        savedRevision.observations,
        nextPendingItems,
        savedRevision.physicalConstraints,
        savedRevision.specifications,
        savedRevision.walls,
        savedRevision.counterPlacement,
      ),
    );
    persistDemoRepository(repository);
    setRevisions(
      repository.listRevisions(demoProject.id).map(revisionFromSnapshot),
    );
    setMeasurementLabel("");
    setMeasurementValue("");
    setMeasurementContext("");
    setMeasurementConfidence("measured");
    setMeasurementResolvesPendingId("");
    setMeasurementError(null);
  }

  function addPendingItem() {
    if (isDirty) {
      setPendingError("Salve ou corrija o rascunho antes de abrir uma pendência.");
      return;
    }
    if (pendingDescription.trim().length === 0 || pendingSourceId.length === 0) {
      setPendingError("Informe a pendência e a medida que originou a tarefa.");
      return;
    }

    const recordedAt = new Date().toISOString();
    const nextPendingItems: PendingItem[] = [
      ...savedRevision.pendingItems,
      {
        id: `demo-pending-${savedRevision.pendingItems.length + 1}`,
        description: pendingDescription.trim(),
        attribution: {
          origin: "field",
          recordedBy: "demonstracao-local",
          recordedAt,
          confidence: "observed",
        },
        sourceRecordIds: [pendingSourceId],
      },
    ];
    const nextNumber = savedRevision.number + 1;
    repository.saveRevision(
      createDemoSnapshot(
        parameters,
        nextNumber,
        recordedAt,
        savedRevision.measurements,
        savedRevision.observations,
        nextPendingItems,
        savedRevision.physicalConstraints,
        savedRevision.specifications,
        savedRevision.walls,
        savedRevision.counterPlacement,
      ),
    );
    persistDemoRepository(repository);
    setRevisions(
      repository.listRevisions(demoProject.id).map(revisionFromSnapshot),
    );
    setPendingDescription("");
    setPendingSourceId("");
    setPendingError(null);
  }

  function addObservation() {
    if (isDirty) {
      setObservationError("Salve ou corrija o rascunho antes de registrar uma observação.");
      return;
    }
    if (observationText.trim().length === 0) {
      setObservationError("Descreva a observação registrada durante a visita.");
      return;
    }
    const recordedAt = new Date().toISOString();
    const nextObservations: Observation[] = [
      ...savedRevision.observations,
      {
        id: `demo-observation-${savedRevision.observations.length + 1}`,
        text: observationText.trim(),
        attribution: {
          origin: "field",
          recordedBy: "demonstracao-local",
          recordedAt,
          confidence: observationConfidence,
        },
        evidenceIds: [],
      },
    ];
    const nextNumber = savedRevision.number + 1;
    repository.saveRevision(
      createDemoSnapshot(
        parameters,
        nextNumber,
        recordedAt,
        savedRevision.measurements,
        nextObservations,
        savedRevision.pendingItems,
        savedRevision.physicalConstraints,
        savedRevision.specifications,
        savedRevision.walls,
        savedRevision.counterPlacement,
      ),
    );
    persistDemoRepository(repository);
    setRevisions(repository.listRevisions(demoProject.id).map(revisionFromSnapshot));
    setObservationText("");
    setObservationConfidence("observed");
    setObservationError(null);
  }

  function openGeometryPending(constraint: PhysicalConstraint) {
    if (isDirty) {
      setPendingError("Salve ou corrija o rascunho antes de abrir uma pendência.");
      return;
    }
    const recordedAt = new Date().toISOString();
    const nextPendingItems: PendingItem[] = [
      ...savedRevision.pendingItems,
      {
        id: `demo-pending-${savedRevision.pendingItems.length + 1}`,
        description: `Conferir ${constraint.label} dentro do retângulo do balcão antes de definir adaptação.`,
        attribution: {
          origin: "field",
          recordedBy: "demonstracao-local",
          recordedAt,
          confidence: "observed",
        },
        sourceRecordIds: [...constraint.sourceRecordIds],
      },
    ];
    const nextNumber = savedRevision.number + 1;
    repository.saveRevision(
      createDemoSnapshot(
        parameters,
        nextNumber,
        recordedAt,
        savedRevision.measurements,
        savedRevision.observations,
        nextPendingItems,
        savedRevision.physicalConstraints,
        savedRevision.specifications,
        savedRevision.walls,
        savedRevision.counterPlacement,
      ),
    );
    persistDemoRepository(repository);
    setRevisions(repository.listRevisions(demoProject.id).map(revisionFromSnapshot));
    setPendingError(null);
  }

  function addConstraint() {
    if (isDirty) {
      setConstraintError("Salve ou corrija o rascunho antes de registrar uma interferência.");
      return;
    }
    const x = Number(constraintX);
    const y = Number(constraintY);
    const dimensionValue = Number(constraintDimensionValue);
    if (
      constraintLabel.trim().length === 0 ||
      constraintDimensionLabel.trim().length === 0 ||
      constraintSourceId.length === 0
    ) {
      setConstraintError("Informe o item, sua dimensão e a medida de origem.");
      return;
    }
    if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(dimensionValue) || dimensionValue <= 0) {
      setConstraintError("Informe posição finita e dimensão maior que zero.");
      return;
    }

    const recordedAt = new Date().toISOString();
    const nextConstraints: PhysicalConstraint[] = [
      ...savedRevision.physicalConstraints,
      {
        id: `demo-constraint-${savedRevision.physicalConstraints.length + 1}`,
        kind: constraintKind,
        label: constraintLabel.trim(),
        position: {
          x,
          y,
          reference: "Canto esquerdo da parede, olhando de frente",
        },
        dimensions: [{
          label: constraintDimensionLabel.trim(),
          value: dimensionValue,
          unit: "mm",
        }],
        attribution: {
          origin: "field",
          recordedBy: "demonstracao-local",
          recordedAt,
          confidence: "measured",
        },
        wallId: constraintWallId || undefined,
        sourceRecordIds: [constraintSourceId],
      },
    ];
    const nextNumber = savedRevision.number + 1;
    repository.saveRevision(
      createDemoSnapshot(
        parameters,
        nextNumber,
        recordedAt,
        savedRevision.measurements,
        savedRevision.observations,
        savedRevision.pendingItems,
        nextConstraints,
        savedRevision.specifications,
        savedRevision.walls,
        savedRevision.counterPlacement,
      ),
    );
    persistDemoRepository(repository);
    setRevisions(
      repository.listRevisions(demoProject.id).map(revisionFromSnapshot),
    );
    setConstraintLabel("");
    setConstraintX("");
    setConstraintY("");
    setConstraintDimensionValue("");
    setConstraintSourceId("");
    setConstraintWallId("");
    setConstraintError(null);
  }

  function addWall() {
    if (isDirty) {
      setWallError("Salve ou corrija o rascunho antes de registrar a parede.");
      return;
    }
    const width = Number(wallWidth);
    const height = Number(wallHeight);
    if (wallLabel.trim().length === 0 || wallSourceId.length === 0) {
      setWallError("Informe a parede e a medida-fonte do levantamento.");
      return;
    }
    if (!Number.isFinite(width) || width <= 0 || !Number.isFinite(height) || height <= 0) {
      setWallError("Informe comprimento e altura maiores que zero.");
      return;
    }

    const recordedAt = new Date().toISOString();
    const nextWalls: Wall[] = [
      ...savedRevision.walls,
      {
        id: `demo-wall-${savedRevision.walls.length + 1}`,
        label: wallLabel.trim(),
        width,
        height,
        unit: "mm",
        attribution: {
          origin: "field",
          recordedBy: "demonstracao-local",
          recordedAt,
          confidence: wallConfidence,
        },
        sourceRecordIds: [wallSourceId],
      },
    ];
    const nextNumber = savedRevision.number + 1;
    repository.saveRevision(
      createDemoSnapshot(
        parameters,
        nextNumber,
        recordedAt,
        savedRevision.measurements,
        savedRevision.observations,
        savedRevision.pendingItems,
        savedRevision.physicalConstraints,
        savedRevision.specifications,
        nextWalls,
        savedRevision.counterPlacement,
      ),
    );
    persistDemoRepository(repository);
    setRevisions(repository.listRevisions(demoProject.id).map(revisionFromSnapshot));
    setWallLabel("");
    setWallWidth("");
    setWallHeight("");
    setWallSourceId("");
    setWallConfidence("measured");
    setWallError(null);
  }

  function saveCounterPlacement() {
    if (isDirty) {
      setPlacementError("Salve ou corrija o rascunho antes de posicionar o balcão.");
      return;
    }
    const x = Number(placementX);
    const y = Number(placementY);
    if (placementWallId.length === 0 || !Number.isFinite(x) || !Number.isFinite(y)) {
      setPlacementError("Selecione a parede e informe as coordenadas X e Y.");
      return;
    }
    const placement: WallPlacement = {
      wallId: placementWallId,
      x,
      y,
      reference: "Canto esquerdo da parede, olhando de frente",
    };
    const nextNumber = savedRevision.number + 1;
    repository.saveRevision(
      createDemoSnapshot(
        parameters,
        nextNumber,
        new Date().toISOString(),
        savedRevision.measurements,
        savedRevision.observations,
        savedRevision.pendingItems,
        savedRevision.physicalConstraints,
        savedRevision.specifications,
        savedRevision.walls,
        placement,
      ),
    );
    persistDemoRepository(repository);
    setRevisions(repository.listRevisions(demoProject.id).map(revisionFromSnapshot));
    setPlacementError(null);
  }

  function addSpecification() {
    if (isDirty) {
      setSpecificationError("Salve ou corrija o rascunho antes de registrar uma especificação.");
      return;
    }
    if (
      specificationLabel.trim().length === 0 ||
      specificationValue.trim().length === 0 ||
      specificationSourceReference.trim().length === 0
    ) {
      setSpecificationError("Informe a especificação, seu valor e a fonte.");
      return;
    }

    const nextSpecifications: ProjectSpecification[] = [
      ...savedRevision.specifications,
      {
        id: `demo-specification-${savedRevision.specifications.length + 1}`,
        scopeId: "demo-counter",
        label: specificationLabel.trim(),
        value: specificationValue.trim(),
        status: "proposed",
        source: {
          kind: specificationSourceKind,
          referenceId: specificationSourceReference.trim(),
        },
      },
    ];
    const nextNumber = savedRevision.number + 1;
    const createdAt = new Date().toISOString();
    repository.saveRevision(
      createDemoSnapshot(
        parameters,
        nextNumber,
        createdAt,
        savedRevision.measurements,
        savedRevision.observations,
        savedRevision.pendingItems,
        savedRevision.physicalConstraints,
        nextSpecifications,
        savedRevision.walls,
        savedRevision.counterPlacement,
      ),
    );
    persistDemoRepository(repository);
    setRevisions(
      repository.listRevisions(demoProject.id).map(revisionFromSnapshot),
    );
    setSpecificationLabel("");
    setSpecificationValue("");
    setSpecificationSourceReference("");
    setSpecificationError(null);
  }

  function restoreRevision(source: Revision) {
    if (isDirty) {
      setHistoryError("Salve ou corrija o rascunho antes de restaurar uma revisão.");
      return;
    }
    const restored = repository.restoreRevision({
      projectId: demoProject.id,
      sourceRevisionId: source.id,
      newRevisionId: `demo-counter-revision-${savedRevision.number + 1}`,
      restoredAt: new Date().toISOString(),
    });
    const restoredRevision = revisionFromSnapshot(restored);
    setParameters(restoredRevision.parameters);
    setRevisions(
      repository.listRevisions(demoProject.id).map(revisionFromSnapshot),
    );
    setPendingProposal(null);
    setProposalError(null);
    setHistoryError(null);
  }

  function clearLocalDraft() {
    if (!window.confirm("Apagar todas as revisões locais deste demonstrador?")) {
      return;
    }
    new BrowserProjectStorage(window.localStorage, demoStorageKey).clear();
    window.location.reload();
  }

  async function synchronizeCurrentRevision() {
    if (!supabase || !authUser) {
      setSyncMessage("Entre com uma conta provisionada antes de sincronizar.");
      return;
    }
    if (isDirty) {
      setSyncMessage("Salve a revisão atual antes de sincronizar.");
      return;
    }
    const snapshot = repository.listRevisions(demoProject.id).at(-1);
    if (!snapshot) {
      setSyncMessage("Não há revisão local para sincronizar.");
      return;
    }
    const queued = enqueueDraftSync(syncQueue, snapshot, new Date().toISOString());
    if (!queued.ok) {
      setSyncMessage(queued.message);
      return;
    }
    const item = queued.queue.find((candidate) => candidate.revisionId === snapshot.revision.id);
    if (!item) {
      setSyncMessage("Não foi possível localizar a revisão enfileirada.");
      return;
    }
    const syncing = markDraftSyncing(queued.queue, item.id);
    if (!syncing.ok) {
      setSyncMessage(syncing.message);
      return;
    }
    setSyncQueue(syncing.queue);
    new BrowserDraftSyncQueue(window.localStorage, syncQueueStorageKey).save(syncing.queue);
    const result = await syncDraftQueueItem(supabase, syncing.queue.find((candidate) => candidate.id === item.id)!);
    if (result.status === "synced") {
      const completed = markDraftSynced(syncing.queue, item.id, result.remoteProjectId, result.remoteRevisionId);
      if (completed.ok) {
        setSyncQueue(completed.queue);
        new BrowserDraftSyncQueue(window.localStorage, syncQueueStorageKey).save(completed.queue);
        setSyncMessage("Revisão sincronizada. O rascunho local foi preservado até uma política de limpeza ser aplicada.");
      }
      return;
    }
    const failed = result.status === "conflict"
      ? markDraftSyncConflict(syncing.queue, item.id, result.message)
      : markDraftSyncFailed(syncing.queue, item.id, result.message);
    if (failed.ok) {
      setSyncQueue(failed.queue);
      new BrowserDraftSyncQueue(window.localStorage, syncQueueStorageKey).save(failed.queue);
      setSyncMessage(result.message);
    }
  }

  function downloadCsv() {
    if (!model || isDirty) return;
    const csv = createPartsCsv(model, savedRevision.number);
    const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8" }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `rayzen-balcao-r${String(savedRevision.number).padStart(2, "0")}.csv`;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
  }

  function downloadProjectBackup() {
    if (isDirty) return;
    const backup = {
      format: "rayzen-marcenaria-local-backup",
      exportedAt: new Date().toISOString(),
      snapshots: repository.listRevisions(demoProject.id),
    };
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `rayzen-projeto-local-r${String(savedRevision.number).padStart(2, "0")}.json`;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
  }

  function downloadTechnicalPackage() {
    if (isDirty || !model) return;
    const technicalPackage = {
      format: "rayzen-technical-project-package",
      formatVersion: 1,
      exportedAt: new Date().toISOString(),
      project: savedRevision,
      parts: model.parts,
      note: "Pacote rastreavel para conferencia da marcenaria. Nao e um arquivo nativo SketchUp.",
    };
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(technicalPackage, null, 2)], { type: "application/json" }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `rayzen-projeto-tecnico-r${String(savedRevision.number).padStart(2, "0")}.skt.json`;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
  }

  function startNewProject() {
    const title = window.prompt("Nome do novo projeto", "Novo projeto de movel");
    if (!title || title.trim().length < 2) return;
    const nextId = `project-${crypto.randomUUID()}`;
    window.localStorage.removeItem(demoStorageKey);
    window.localStorage.removeItem(syncQueueStorageKey);
    window.localStorage.setItem(projectMetaStorageKey, JSON.stringify({ id: nextId, title: title.trim() }));
    window.location.reload();
  }

  async function inspectProjectBackup(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const result = validateLocalProjectBackup(await file.text());
    if (result.ok) {
      setRestorableBackup(result.backup);
      setBackupInspection(`Backup compatível: ${result.backup.snapshots.length} revisão(ões). Nenhum dado foi restaurado.`);
      return;
    }
    setRestorableBackup(null);
    setBackupInspection(result.message);
  }

  function restoreValidatedBackup() {
    if (restorableBackup === null) return;
    if (!window.confirm("Restaurar este backup substituirá o rascunho local atual deste demonstrador. Baixe um backup do estado atual antes de continuar. Deseja restaurar?")) {
      return;
    }
    new BrowserProjectStorage(window.localStorage, demoStorageKey).save(restorableBackup.snapshots);
    window.location.reload();
  }

  return (
    <main className="workspace">
      <header className="topbar">
        <a className="brand" href="#inicio" aria-label="Rayzen Marcenaria, início">
          <RayzenMark />
          <span>
            <strong>rayzen</strong>
            <small>MARCENARIA DIGITAL</small>
          </span>
        </a>
        <div className="topbar-project">
          <span className="project-id">PROJETO ATUAL</span>
          <span className="topbar-divider" aria-hidden="true" />
          <span>{demoProject.title}</span>
          <button type="button" className="text-button" onClick={startNewProject}>Novo projeto</button>
        </div>
        <div className="topbar-status">
          <span className="status-dot" />
          <span>{draftSynchronization.label} · rascunho no dispositivo</span>
        </div>
      </header>

      <div className="page">
        <AuthPanel onUserChange={setAuthUser} />
        <section className="project-heading" aria-labelledby="project-title">
          <div className="heading-main">
            <h1 id="project-title">{demoProject.title}</h1>
            <p>Demonstração local · modelo geométrico em MDF, sem portas ou fundo</p>
          </div>
          <RevisionTicket
            revision={savedRevision}
            isDirty={isDirty}
            invalid={issues.length > 0}
          />
        </section>

        <section className="history-section" aria-labelledby="history-title">
          <div>
            <span className="small-label">TRILHA DE REVISÕES</span>
            <h2 id="history-title">Histórico do projeto</h2>
          </div>
          <ol>
            {[...revisions].reverse().map((revision) => (
              <li key={revision.id} className={revision.id === savedRevision.id ? "current" : ""}>
                <div>
                  <strong>R{String(revision.number).padStart(2, "0")}</strong>
                  <span>{revision.savedAt}</span>
                  <small>
                    {revision.measurements.length} medidas · {revision.physicalConstraints.length} interferências · {revision.specifications.length} especificações
                  </small>
                </div>
                {revision.id === savedRevision.id ? (
                  <em>ATUAL</em>
                ) : (
                  <button type="button" onClick={() => restoreRevision(revision)} disabled={isDirty}>
                    Restaurar como R{String(savedRevision.number + 1).padStart(2, "0")}
                  </button>
                )}
              </li>
            ))}
          </ol>
          <button type="button" onClick={downloadProjectBackup} disabled={isDirty}>
            Baixar backup local (JSON)
          </button>
          <button type="button" onClick={() => void synchronizeCurrentRevision()} disabled={isDirty || latestSyncItem?.status === "syncing"}>
            {latestSyncItem?.status === "synced" ? "Revisão sincronizada" : "Sincronizar revisão salva"}
          </button>
          <button type="button" onClick={downloadTechnicalPackage} disabled={isDirty || !model}>
            Exportar pacote técnico (.skt.json)
          </button>
          <label className="backup-inspect">
            Validar backup local
            <input type="file" accept="application/json,.json" onChange={inspectProjectBackup} />
          </label>
          {backupInspection ? <p className="backup-inspection" role="status">{backupInspection}</p> : null}
          {restorableBackup ? (
            <button className="restore-backup-button" type="button" onClick={restoreValidatedBackup}>
              Restaurar backup validado
            </button>
          ) : null}
          <button className="clear-local-button" type="button" onClick={clearLocalDraft}>
            Limpar rascunho local
          </button>
          <p className="synchronization-note" role="status">
            <strong>{draftSynchronization.label}.</strong> {draftSynchronization.detail} Confirmação do cliente, validação comercial e liberação técnica permanecem indisponíveis neste demonstrador.
          </p>
          {historyError ? <p className="measurement-error" role="alert">{historyError}</p> : null}
          {syncMessage ? <p className="sync-message" role="status">{syncMessage}</p> : null}
        </section>
        <section className="project-checks" aria-labelledby="checks-title">
          <div className="constraint-heading">
            <div>
              <span className="small-label">CONFERÊNCIAS</span>
              <h2 id="checks-title">Rascunho atual</h2>
            </div>
            <span>{projectChecks.length} ALERTAS</span>
          </div>
          <p>Estes alertas organizam a conferência da revisão. Não são uma liberação de fabricação.</p>
          {projectChecks.length > 0 ? (
            <ul>
              {projectChecks.map((check) => <li key={check.id}>{check.message}</li>)}
            </ul>
          ) : (
            <p className="checks-clear">Nenhuma lacuna verificada por esta checagem local.</p>
          )}
        </section>

        <div className="layout-grid">
          <section className="spec-panel" aria-labelledby="spec-title">
            <div className="panel-title-row">
              <div>
                <h2 id="spec-title">Dimensões externas</h2>
              </div>
              <span className="unit-tag">MM</span>
            </div>

            <div className="measurement-list">
              <DimensionField
                label="Largura"
                code="EIXO X"
                value={parameters.width}
                onChange={(value) => updateParameter("width", value)}
                error={issues.find((issue) => issue.field === "width")?.message}
              />
              <DimensionField
                label="Altura"
                code="EIXO Y"
                value={parameters.height}
                onChange={(value) => updateParameter("height", value)}
                error={issues.find((issue) => issue.field === "height")?.message}
              />
              <DimensionField
                label="Profundidade"
                code="EIXO Z"
                value={parameters.depth}
                onChange={(value) => updateParameter("depth", value)}
                error={issues.find((issue) => issue.field === "depth")?.message}
              />
            </div>

            <div className="construction-rule">
              <span className="rule-icon" aria-hidden="true">
                <RulerIcon />
              </span>
              <div>
                <span className="small-label">REGRA CONSTRUTIVA</span>
                <p>Tampo e base entre as laterais</p>
              </div>
            </div>

            <div className="material-row">
              <div className="material-swatch" aria-hidden="true" />
              <div className="material-copy">
                <span className="small-label">MATERIAL</span>
                <strong>MDF · {parameters.thickness} mm</strong>
              </div>
              <button
                className="stepper"
                type="button"
                aria-label="Diminuir espessura do MDF em 1 milímetro"
                onClick={() =>
                  setParameters((current) => ({
                    ...current,
                    thickness: current.thickness - 1,
                  }))
                }
              >
                −
              </button>
              <button
                className="stepper"
                type="button"
                aria-label="Aumentar espessura do MDF em 1 milímetro"
                onClick={() =>
                  setParameters((current) => ({
                    ...current,
                    thickness: current.thickness + 1,
                  }))
                }
              >
                +
              </button>
            </div>

            <div className="panel-footnote">
              <span className="footnote-marker" />
              <p>
                Espessura aplicada no cálculo. Meça e confirme no local antes de
                fabricar.
              </p>
            </div>

            <div className="chat-area" aria-labelledby="chat-title">
              <span className="small-label" id="chat-title">CONVERSA DE PROJETO</span>
              <p>Descreva uma alteração. A conversa gera apenas uma proposta para sua confirmação.</p>
              <div className="proposal-input-row">
                <label>
                  Mensagem
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(event) => setChatInput(event.target.value)}
                    placeholder="Ex.: largura 900 mm"
                    aria-label="Mensagem para a conversa de projeto"
                  />
                </label>
                <button className="proposal-button" type="button" onClick={submitProjectChat} disabled={chatInput.trim().length === 0}>
                  Propor
                </button>
              </div>
              {chatMessage ? <p className="proposal-message" role="status">{chatMessage}</p> : null}
            </div>

            <div className="proposal-area" aria-labelledby="proposal-title">
              <span className="small-label" id="proposal-title">PROPOSTA CONTROLADA</span>
              <p>Pré-visualize uma mudança antes de criar a próxima revisão.</p>
              <div className="proposal-input-row">
                <label>
                  Nova largura
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={proposedWidth}
                    onChange={(event) => setProposedWidth(event.target.value)}
                    aria-label="Largura proposta em milímetros"
                  />
                  <span>mm</span>
                </label>
                <button
                  className="proposal-button"
                  type="button"
                  onClick={previewWidthProposal}
                  disabled={issues.length > 0 || isDirty}
                >
                  Ver proposta
                </button>
              </div>
              {proposalError ? <p className="proposal-error" role="alert">{proposalError}</p> : null}
              {pendingProposal && pendingPreview ? (
                <div className="proposal-preview" role="status">
                  <strong>Alterar largura de {pendingProposal.currentValue} para {pendingProposal.proposedValue} mm</strong>
                  <span>
                    Tampo e base: {pendingPreview.before.parts[1]?.length} → {pendingPreview.after.parts[1]?.length} mm
                  </span>
                  <div>
                    <button className="proposal-accept" type="button" onClick={acceptProposal}>
                      Aceitar e salvar R{String(savedRevision.number + 1).padStart(2, "0")}
                    </button>
                    <button className="proposal-reject" type="button" onClick={() => setPendingProposal(null)}>
                      Rejeitar
                    </button>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="save-area">
              {issues.length > 0 ? (
                <div className="validation-message" role="alert">
                  <span aria-hidden="true">!</span>
                  <div>
                    <strong>Não é possível salvar a revisão</strong>
                    <p>Corrija as medidas indicadas antes de continuar.</p>
                  </div>
                </div>
              ) : null}
              <button
                className="save-button"
                type="button"
                onClick={saveRevision}
                disabled={!isDirty || issues.length > 0}
              >
                <span>Salvar nova revisão</span>
                <SaveIcon />
              </button>
              <p className="save-helper">
                A exportação inclui apenas a revisão salva.
              </p>
            </div>
          </section>

          <section className="drawing-panel" aria-labelledby="drawing-title">
            <div className="drawing-header">
              <div>
                <h2 id="drawing-title">Vista do conjunto</h2>
              </div>
              <div className="drawing-tools">
                <div className="view-switcher" role="group" aria-label="Vista do modelo">
                  <ViewButton
                    active={view === "isometric"}
                    label="Isométrica"
                    onClick={() => setView("isometric")}
                  >
                    <CubeIcon />
                  </ViewButton>
                  <ViewButton
                    active={view === "front"}
                    label="Frontal"
                    onClick={() => setView("front")}
                  >
                    <FrontIcon />
                  </ViewButton>
                  <ViewButton
                    active={view === "side"}
                    label="Lateral"
                    onClick={() => setView("side")}
                  >
                    <SideIcon />
                  </ViewButton>
                  <ViewButton
                    active={view === "top"}
                    label="Superior"
                    onClick={() => setView("top")}
                  >
                    <TopIcon />
                  </ViewButton>
                </div>
                <span className="drawing-scale">ESCALA VISUAL</span>
              </div>
            </div>

            <div className="scene-wrap">
              {model ? (
                <Suspense fallback={<div className="scene-loading">Carregando modelo…</div>}>
                  <Canvas
                    camera={{ position: [1.32, 1.08, 1.55], fov: 36 }}
                    dpr={[1, 1.5]}
                    aria-label="Visualização tridimensional do balcão"
                  >
                    <color attach="background" args={["#f0f1ee"]} />
                    <ambientLight intensity={1.5} />
                    <directionalLight position={[3, 5, 4]} intensity={2.2} />
                    <CounterScene
                      parameters={parameters}
                      selectedPart={selectedPart}
                      onSelect={setSelectedPart}
                      view={view}
                    />
                  </Canvas>
                </Suspense>
              ) : (
                <div className="scene-error" role="status">
                  <strong>O modelo precisa de medidas válidas.</strong>
                  <span>Corrija a ficha para reconstruir a geometria.</span>
                </div>
              )}
              <div className="scene-stamp" aria-hidden="true">
                <span>DEMO</span>
                <Barcode />
                <span>MM · MDF {parameters.thickness}</span>
              </div>
              <div className="scene-axis" aria-hidden="true">
                <span>X</span>
                <i className="axis-x" />
                <span>Y</span>
                <i className="axis-y" />
                <span>Z</span>
              </div>
              <div className="scene-note">
                <span className="note-line" />
                <span>
                  {selectedPart
                    ? `PEÇA ${model?.parts.find((part) => part.id === selectedPart)?.code ?? ""} SELECIONADA`
                    : "SELECIONE UMA PEÇA NA LISTA"}
                </span>
              </div>
            </div>

            <div className="dimension-rail" aria-label="Dimensões externas do balcão">
              <DimensionReadout label="LARGURA" value={parameters.width} axis="X" />
              <DimensionReadout label="ALTURA" value={parameters.height} axis="Y" />
              <DimensionReadout label="PROFUNDIDADE" value={parameters.depth} axis="Z" />
            </div>
          </section>
        </div>

        <section className="visit-section" aria-labelledby="visit-title">
          <div className="visit-heading">
            <div>
              <span className="small-label">LEVANTAMENTO</span>
              <h2 id="visit-title">Medidas registradas</h2>
            </div>
            <span className="visit-count">{savedRevision.measurements.length} REGISTROS</span>
          </div>
          <p className="visit-intro">
            Cada medida cria uma nova revisão e mantém origem, contexto e confiança visíveis.
          </p>
          <div className="measurement-form">
            <label>
              Medida
              <input
                value={measurementLabel}
                onChange={(event) => setMeasurementLabel(event.target.value)}
                placeholder="Ex.: altura da saída de esgoto"
              />
            </label>
            <label>
              Valor (mm)
              <input
                type="number"
                min="1"
                step="1"
                value={measurementValue}
                onChange={(event) => setMeasurementValue(event.target.value)}
              />
            </label>
            <label>
              Contexto
              <input
                value={measurementContext}
                onChange={(event) => setMeasurementContext(event.target.value)}
                placeholder="Ex.: a partir do piso acabado"
              />
            </label>
            <label>
              Confiança
              <select
                value={measurementConfidence}
                onChange={(event) =>
                  setMeasurementConfidence(event.target.value as MeasurementConfidence)
                }
              >
                <option value="measured">Medido</option>
                <option value="observed">Observado</option>
                <option value="informed">Informado</option>
                <option value="estimated">Estimado</option>
              </select>
            </label>
            <label>
              Concluir pendência
              <select
                value={measurementResolvesPendingId}
                onChange={(event) => setMeasurementResolvesPendingId(event.target.value)}
              >
                <option value="">Nenhuma</option>
                {savedRevision.pendingItems
                  .filter((item) => item.resolvedByRecordId === undefined)
                  .map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.description}
                    </option>
                  ))}
              </select>
            </label>
            <button type="button" onClick={addMeasurement} disabled={issues.length > 0 || isDirty}>
              Registrar medida
            </button>
          </div>
          {measurementError ? <p className="measurement-error" role="alert">{measurementError}</p> : null}
          {savedRevision.measurements.length > 0 ? (
            <ul className="measurement-records">
              {savedRevision.measurements.map((measurement) => (
                <li key={measurement.id}>
                  <strong>{measurement.label}</strong>
                  <span>{measurement.value} {measurement.unit} · {measurement.context}</span>
                  <em>{measurement.attribution.confidence}</em>
                </li>
              ))}
            </ul>
          ) : (
            <p className="empty-measurements">Nenhuma medida registrada nesta revisão.</p>
          )}
          <div className="observation-area">
            <div className="constraint-heading">
              <div>
                <span className="small-label">OBSERVAÇÕES</span>
                <h3>Anotações da visita</h3>
              </div>
              <span>{savedRevision.observations.length} REGISTRADAS</span>
            </div>
            <p>Uma observação mantém o que foi visto ou informado separado de uma medida confirmada.</p>
            <div className="observation-form">
              <label>
                Observação
                <input value={observationText} onChange={(event) => setObservationText(event.target.value)} placeholder="Ex.: suporte da pia visível no lado esquerdo" />
              </label>
              <label>
                Confiança
                <select value={observationConfidence} onChange={(event) => setObservationConfidence(event.target.value as MeasurementConfidence)}>
                  <option value="observed">Observado</option>
                  <option value="informed">Informado</option>
                  <option value="estimated">Estimado</option>
                  <option value="measured">Medido</option>
                </select>
              </label>
              <button type="button" onClick={addObservation} disabled={issues.length > 0 || isDirty}>Registrar observação</button>
            </div>
            {observationError ? <p className="measurement-error" role="alert">{observationError}</p> : null}
            {savedRevision.observations.length > 0 ? (
              <ul className="observation-records">
                {savedRevision.observations.map((observation) => (
                  <li key={observation.id}>
                    <strong>{observation.text}</strong>
                    <em>{observation.attribution.confidence}</em>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
          <div className="pending-area">
            <div className="constraint-heading">
              <div>
                <span className="small-label">PENDÊNCIAS</span>
                <h3>Conferências necessárias</h3>
              </div>
              <span>{savedRevision.pendingItems.filter((item) => item.resolvedByRecordId === undefined).length} ABERTAS</span>
            </div>
            <p>Uma pendência aponta para o dado que motivou a conferência; ela não cria uma medida presumida.</p>
            <div className="pending-form">
              <label>
                Pendência
                <input
                  value={pendingDescription}
                  onChange={(event) => setPendingDescription(event.target.value)}
                  placeholder="Ex.: medir distância da tomada ao canto"
                />
              </label>
              <label>
                Medida de origem
                <select value={pendingSourceId} onChange={(event) => setPendingSourceId(event.target.value)}>
                  <option value="">Selecione</option>
                  {savedRevision.measurements.map((measurement) => (
                    <option key={measurement.id} value={measurement.id}>
                      {measurement.label} · {measurement.value} mm
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                onClick={addPendingItem}
                disabled={issues.length > 0 || isDirty || savedRevision.measurements.length === 0}
              >
                Abrir pendência
              </button>
            </div>
            {pendingError ? <p className="measurement-error" role="alert">{pendingError}</p> : null}
            {savedRevision.pendingItems.length > 0 ? (
              <ul className="pending-records">
                {savedRevision.pendingItems.map((item) => {
                  const sourceMeasurement = savedRevision.measurements.find(
                    (measurement) => measurement.id === item.sourceRecordIds[0],
                  );
                  const resolutionMeasurement = savedRevision.measurements.find(
                    (measurement) => measurement.id === item.resolvedByRecordId,
                  );
                  return (
                    <li key={item.id}>
                      <div>
                        <strong>{item.description}</strong>
                        <span>Origem: {sourceMeasurement?.label ?? item.sourceRecordIds[0]}</span>
                      </div>
                      <em>
                        {resolutionMeasurement
                          ? `CONCLUÍDA: ${resolutionMeasurement.label}`
                          : "ABERTA"}
                      </em>
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </div>
          <div className="constraint-area">
            <div className="constraint-heading">
              <div>
                <span className="small-label">INTERFERÊNCIAS</span>
                <h3>Elementos do ambiente</h3>
              </div>
              <span>{savedRevision.physicalConstraints.length} REGISTRADAS</span>
            </div>
            <p>Registre a posição e a medida-fonte antes de propor qualquer recuo.</p>
            <div className="constraint-form">
              <label>
                Tipo
                <select
                  value={constraintKind}
                  onChange={(event) =>
                    setConstraintKind(event.target.value as PhysicalConstraint["kind"])
                  }
                >
                  <option value="plumbing-outlet">Saída de esgoto</option>
                  <option value="sink-bracket">Suporte de pia</option>
                  <option value="electrical-point">Ponto elétrico</option>
                  <option value="pillar">Pilar</option>
                  <option value="opening">Vão</option>
                  <option value="other">Outro</option>
                </select>
              </label>
              <label>
                Identificação
                <input
                  value={constraintLabel}
                  onChange={(event) => setConstraintLabel(event.target.value)}
                  placeholder="Ex.: saída da pia"
                />
              </label>
              <label>
                X (mm)
                <input type="number" value={constraintX} onChange={(event) => setConstraintX(event.target.value)} />
              </label>
              <label>
                Y (mm)
                <input type="number" value={constraintY} onChange={(event) => setConstraintY(event.target.value)} />
              </label>
              <label>
                Dimensão
                <input
                  value={constraintDimensionLabel}
                  onChange={(event) => setConstraintDimensionLabel(event.target.value)}
                />
              </label>
              <label>
                Valor (mm)
                <input
                  type="number"
                  min="1"
                  value={constraintDimensionValue}
                  onChange={(event) => setConstraintDimensionValue(event.target.value)}
                />
              </label>
              <label>
                Medida-fonte
                <select
                  value={constraintSourceId}
                  onChange={(event) => setConstraintSourceId(event.target.value)}
                >
                  <option value="">Selecione</option>
                  {savedRevision.measurements.map((measurement) => (
                    <option key={measurement.id} value={measurement.id}>
                      {measurement.label} · {measurement.value} mm
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Parede na elevação
                <select
                  value={constraintWallId}
                  onChange={(event) => setConstraintWallId(event.target.value)}
                >
                  <option value="">Ainda não posicionar</option>
                  {savedRevision.walls.map((wall) => (
                    <option key={wall.id} value={wall.id}>{wall.label}</option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                onClick={addConstraint}
                disabled={issues.length > 0 || isDirty || savedRevision.measurements.length === 0}
              >
                Registrar interferência
              </button>
            </div>
            {constraintError ? <p className="measurement-error" role="alert">{constraintError}</p> : null}
            {savedRevision.physicalConstraints.length > 0 ? (
              <ul className="constraint-records">
                {savedRevision.physicalConstraints.map((constraint) => (
                  <li key={constraint.id}>
                    <button
                      type="button"
                      className={selectedConstraintId === constraint.id ? "constraint-selected" : ""}
                      aria-pressed={selectedConstraintId === constraint.id}
                      onClick={() => setSelectedConstraintId((current) => current === constraint.id ? null : constraint.id)}
                    >
                    <strong>{constraint.label}</strong>
                    <span>
                      X {constraint.position.x} · Y {constraint.position.y} · {constraint.dimensions[0]?.label} {constraint.dimensions[0]?.value} mm
                    </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
            {selectedConstraint ? (
              <div className="constraint-selection" role="status">
                <strong>{selectedConstraint.label}</strong>
                <span>Referência: {selectedConstraint.position.reference} · Confiança: {selectedConstraint.attribution.confidence}</span>
              </div>
            ) : null}
          </div>
          <div className="elevation-area">
            <div className="constraint-heading">
              <div>
                <span className="small-label">ELEVAÇÃO 2D</span>
                <h3>Parede e pontos registrados</h3>
              </div>
              <span>{savedRevision.walls.length} PAREDES</span>
            </div>
            <p>As cotas vêm do levantamento. O desenho apenas projeta os pontos registrados; não calcula recuos nem folgas.</p>
            <div className="elevation-form">
              <label>
                Parede
                <input value={wallLabel} onChange={(event) => setWallLabel(event.target.value)} placeholder="Ex.: parede da pia" />
              </label>
              <label>
                Comprimento (mm)
                <input type="number" min="1" value={wallWidth} onChange={(event) => setWallWidth(event.target.value)} />
              </label>
              <label>
                Altura (mm)
                <input type="number" min="1" value={wallHeight} onChange={(event) => setWallHeight(event.target.value)} />
              </label>
              <label>
                Confiança
                <select value={wallConfidence} onChange={(event) => setWallConfidence(event.target.value as MeasurementConfidence)}>
                  <option value="measured">Medido</option>
                  <option value="observed">Observado</option>
                  <option value="informed">Informado</option>
                  <option value="estimated">Estimado</option>
                </select>
              </label>
              <label>
                Medida-fonte
                <select value={wallSourceId} onChange={(event) => setWallSourceId(event.target.value)}>
                  <option value="">Selecione</option>
                  {savedRevision.measurements.map((measurement) => (
                    <option key={measurement.id} value={measurement.id}>
                      {measurement.label} · {measurement.value} mm
                    </option>
                  ))}
                </select>
              </label>
              <button type="button" onClick={addWall} disabled={issues.length > 0 || isDirty || savedRevision.measurements.length === 0}>
                Registrar parede
              </button>
            </div>
            {wallError ? <p className="measurement-error" role="alert">{wallError}</p> : null}
            <div className="placement-form">
              <label>
                Parede do balcão
                <select value={placementWallId} onChange={(event) => setPlacementWallId(event.target.value)}>
                  <option value="">Selecione</option>
                  {savedRevision.walls.map((wall) => <option key={wall.id} value={wall.id}>{wall.label}</option>)}
                </select>
              </label>
              <label>
                X do balcão (mm)
                <input type="number" value={placementX} onChange={(event) => setPlacementX(event.target.value)} />
              </label>
              <label>
                Y do balcão (mm)
                <input type="number" value={placementY} onChange={(event) => setPlacementY(event.target.value)} />
              </label>
              <button type="button" onClick={saveCounterPlacement} disabled={issues.length > 0 || isDirty || savedRevision.walls.length === 0}>
                Posicionar balcão
              </button>
            </div>
            {placementError ? <p className="measurement-error" role="alert">{placementError}</p> : null}
            {savedRevision.walls.map((wall) => {
              const markers = projectConstraintsOnWall(
                wall,
                savedRevision.physicalConstraints.filter((constraint) => constraint.wallId === wall.id),
              );
              const furnitureProjection = savedRevision.counterPlacement?.wallId === wall.id
                ? projectFurnitureOnWall(wall, savedRevision.counterPlacement, savedRevision.parameters)
                : null;
              const overlappingConstraints = savedRevision.counterPlacement?.wallId === wall.id
                ? findConstraintsInsideFurniture(
                    savedRevision.counterPlacement,
                    savedRevision.parameters,
                    savedRevision.physicalConstraints.filter((constraint) => constraint.wallId === wall.id),
                  )
                : [];
              return (
                <article className="elevation-card" key={wall.id}>
                  <header>
                    <strong>{wall.label}</strong>
                    <span>{wall.width} × {wall.height} mm · {wall.attribution.confidence}</span>
                  </header>
                  <div className="wall-elevation" aria-label={`Elevação da ${wall.label}`}>
                    <span className="wall-dimension wall-dimension-width">{wall.width} mm</span>
                    <span className="wall-dimension wall-dimension-height">{wall.height} mm</span>
                    {furnitureProjection ? (
                      <div
                        className={`elevation-furniture${furnitureProjection.inBounds ? "" : " elevation-furniture-outside"}`}
                        style={{
                          left: `${furnitureProjection.leftPercent}%`,
                          bottom: `${furnitureProjection.bottomPercent}%`,
                          width: `${furnitureProjection.widthPercent}%`,
                          height: `${furnitureProjection.heightPercent}%`,
                        }}
                      >
                        <span>Balcão · {savedRevision.parameters.width} × {savedRevision.parameters.height} mm</span>
                      </div>
                    ) : null}
                    {markers.map((marker) => (
                      <button
                        type="button"
                        className={`elevation-marker${marker.inBounds ? "" : " elevation-marker-outside"}${selectedConstraintId === marker.id ? " elevation-marker-selected" : ""}`}
                        key={marker.id}
                        style={{ left: `${marker.xPercent}%`, bottom: `${100 - marker.yPercent}%` }}
                        title={marker.label}
                        aria-pressed={selectedConstraintId === marker.id}
                        onClick={() => setSelectedConstraintId((current) => current === marker.id ? null : marker.id)}
                      >
                        <span>{marker.label}</span>
                      </button>
                    ))}
                    {markers.length === 0 ? <p>Nenhuma interferência posicionada nesta parede.</p> : null}
                  </div>
                  {markers.some((marker) => !marker.inBounds) ? (
                    <p className="elevation-warning">Há ponto fora dos limites registrados: confira a posição ou as dimensões da parede.</p>
                  ) : null}
                  {furnitureProjection && !furnitureProjection.inBounds ? (
                    <p className="elevation-warning">O balcão ultrapassa os limites registrados desta parede. Nenhum ajuste foi aplicado.</p>
                  ) : null}
                  {overlappingConstraints.length > 0 ? (
                    <div className="elevation-warning">
                      <p>Conferir ponto(s) dentro do retângulo do balcão: {overlappingConstraints.map((constraint) => constraint.label).join(", ")}. Isso não define recuo ou folga.</p>
                      {overlappingConstraints.map((constraint) => (
                        <button key={constraint.id} type="button" onClick={() => openGeometryPending(constraint)}>
                          Abrir pendência: {constraint.label}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
          <div className="specification-area">
            <div className="constraint-heading">
              <div>
                <span className="small-label">ESPECIFICAÇÕES</span>
                <h3>Detalhes deste projeto</h3>
              </div>
              <span>{savedRevision.specifications.length} PROPOSTAS</span>
            </div>
            <p>Ferragens, materiais e detalhes do Promob ficam vinculados a esta revisão.</p>
            <div className="specification-form">
              <label>
                Especificação
                <input
                  value={specificationLabel}
                  onChange={(event) => setSpecificationLabel(event.target.value)}
                  placeholder="Ex.: dobradiça"
                />
              </label>
              <label>
                Valor
                <input
                  value={specificationValue}
                  onChange={(event) => setSpecificationValue(event.target.value)}
                  placeholder="Ex.: com amortecimento"
                />
              </label>
              <label>
                Fonte
                <select
                  value={specificationSourceKind}
                  onChange={(event) =>
                    setSpecificationSourceKind(event.target.value as SpecificationSourceKind)
                  }
                >
                  <option value="promob">Promob</option>
                  <option value="sketchup">SketchUp</option>
                  <option value="field">Levantamento</option>
                  <option value="document">Documento</option>
                  <option value="customer">Cliente</option>
                  <option value="manual">Manual</option>
                  <option value="import">Importação</option>
                </select>
              </label>
              <label>
                Referência da fonte
                <input
                  value={specificationSourceReference}
                  onChange={(event) => setSpecificationSourceReference(event.target.value)}
                  placeholder="Ex.: arquivo Promob v1"
                />
              </label>
              <button type="button" onClick={addSpecification} disabled={issues.length > 0 || isDirty}>
                Registrar especificação
              </button>
            </div>
            {specificationError ? <p className="measurement-error" role="alert">{specificationError}</p> : null}
            {savedRevision.specifications.length > 0 ? (
              <ul className="specification-records">
                {savedRevision.specifications.map((specification) => (
                  <li key={specification.id}>
                    <strong>{specification.label}</strong>
                    <span>{String(specification.value)}</span>
                    <em>{specification.source.kind} · {specification.status}</em>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </section>

        <section className="parts-section" aria-labelledby="parts-title">
          <div className="parts-heading">
            <div className="parts-title">
              <h2 id="parts-title">Painéis do balcão</h2>
            </div>
            <div className="parts-actions">
              <span className="part-count">
                {model ? `${model.parts.length} TIPOS · ${model.parts.reduce((sum, part) => sum + part.quantity, 0)} PEÇAS` : "MODELO INVÁLIDO"}
              </span>
              <button
                className="export-button"
                type="button"
                onClick={downloadCsv}
                disabled={!model || isDirty}
              >
                <DownloadIcon />
                <span>Exportar CSV</span>
              </button>
            </div>
          </div>
          {isDirty ? (
            <div className="draft-banner" role="status">
              <span className="draft-mark" />
              <span>Prévia de alterações</span>
              <span className="draft-separator">·</span>
              <span>Salve uma nova revisão para habilitar a exportação.</span>
            </div>
          ) : null}
          <div className="parts-table-wrap">
            <table className="parts-table">
              <thead>
                <tr>
                  <th scope="col">CÓDIGO</th>
                  <th scope="col">PEÇA</th>
                  <th scope="col">QTD.</th>
                  <th scope="col">COMPRIMENTO</th>
                  <th scope="col">LARGURA</th>
                  <th scope="col">ESP.</th>
                  <th scope="col">MATERIAL</th>
                  <th scope="col">BORDAS</th>
                </tr>
              </thead>
              <tbody>
                {model?.parts.map((part) => (
                  <PartRow
                    key={part.id}
                    part={part}
                    selected={selectedPart === part.id}
                    onSelect={() =>
                      setSelectedPart((current) =>
                        current === part.id ? null : part.id,
                      )
                    }
                  />
                ))}
                {!model ? (
                  <tr>
                    <td colSpan={8} className="invalid-row">
                      Corrija as dimensões da ficha para calcular as peças.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
          <div className="parts-foot">
            <span>
              <span className="footer-dot" />
              Regra aplicada: tampo e base encaixados entre as laterais
            </span>
            <span>Sem portas · sem fundo · sem otimização de corte</span>
          </div>
        </section>

        <footer className="page-footer">
          <span>RAYZEN · CADERNO DE PROJETO</span>
          <span>MEDIDAS EM MILÍMETROS · CONFERIR ANTES DA FABRICAÇÃO</span>
        </footer>
      </div>
    </main>
  );
}

function DimensionField({
  label,
  code,
  value,
  onChange,
  error,
}: {
  label: string;
  code: string;
  value: number;
  onChange: (value: string) => void;
  error?: string;
}) {
  return (
    <label className={`dimension-field${error ? " has-error" : ""}`}>
      <span className="field-label">
        <span>{label}</span>
        <span className="field-code">{code}</span>
      </span>
      <span className="field-input-line">
        <input
          type="number"
          min="1"
          step="1"
          value={Number.isFinite(value) ? value : ""}
          onChange={(event) => onChange(event.target.value)}
          aria-label={`${label} externa em milímetros`}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${code}-error` : undefined}
        />
        <span className="input-unit">mm</span>
      </span>
      {error ? (
        <span className="field-error" id={`${code}-error`}>
          {error}
        </span>
      ) : null}
    </label>
  );
}

function RevisionTicket({
  revision,
  isDirty,
  invalid,
}: {
  revision: Revision;
  isDirty: boolean;
  invalid: boolean;
}) {
  return (
    <div className={`revision-ticket${isDirty || invalid ? " changed" : ""}`}>
      <div className="ticket-main">
        <span className="small-label">REVISÃO ATUAL</span>
        <div className="ticket-number-row">
          <strong>R{String(revision.number).padStart(2, "0")}</strong>
          <span className="ticket-status">
            {invalid ? "MEDIDAS INVÁLIDAS" : isDirty ? "ALTERAÇÕES" : "SALVA"}
          </span>
        </div>
        <span className="ticket-time">{revision.savedAt}</span>
      </div>
      <div className="ticket-perforation" aria-hidden="true" />
      <div className="ticket-code">
        <Barcode />
        <span>DEMO-R{String(revision.number).padStart(2, "0")}</span>
      </div>
    </div>
  );
}

function DimensionReadout({
  label,
  value,
  axis,
}: {
  label: string;
  value: number;
  axis: string;
}) {
  return (
    <div className="dimension-readout">
      <span className="dimension-axis">{axis}</span>
      <span className="dimension-label">{label}</span>
      <strong>{Number.isFinite(value) ? value : "—"}</strong>
      <span className="dimension-unit">mm</span>
    </div>
  );
}

function PartRow({
  part,
  selected,
  onSelect,
}: {
  part: Part;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <tr
      className={selected ? "selected-row" : ""}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect();
        }
      }}
      tabIndex={0}
      aria-pressed={selected}
    >
      <td>
        <span className="part-code">{part.code}</span>
      </td>
      <td className="part-name">{part.name}</td>
      <td>{part.quantity.toString().padStart(2, "0")}</td>
      <td>{part.length}</td>
      <td>{part.width}</td>
      <td>{part.thickness}</td>
      <td>{part.material}</td>
      <td>{part.edges}</td>
    </tr>
  );
}

function ViewButton({
  active,
  label,
  onClick,
  children,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      className={`view-button${active ? " active" : ""}`}
      type="button"
      onClick={onClick}
      aria-label={`Vista ${label}`}
      aria-pressed={active}
      title={label}
    >
      {children}
    </button>
  );
}

function CounterScene({
  parameters,
  selectedPart,
  onSelect,
  view,
}: {
  parameters: CounterParameters;
  selectedPart: string | null;
  onSelect: (id: string | null) => void;
  view: ViewMode;
}) {
  const scale = 1 / Math.max(parameters.width, parameters.height, parameters.depth);
  const width = parameters.width * scale;
  const height = parameters.height * scale;
  const depth = parameters.depth * scale;
  const thickness = parameters.thickness * scale;
  const insideWidth = width - thickness * 2;
  const camera = {
    isometric: [1.32, 1.08, 1.55],
    front: [0, 0.18, 2.5],
    side: [2.5, 0.18, 0],
    top: [0, 2.7, 0.01],
  }[view] as [number, number, number];

  return (
    <>
      <PerspectiveCamera position={camera} />
      <group position={[0, -height / 2, 0]}>
        <PieceMesh
          id="counter-side-left"
          center={[-width / 2 + thickness / 2, height / 2, 0]}
          size={[thickness, height, depth]}
          selected={selectedPart === "counter-side"}
          onClick={() => onSelect(selectedPart === "counter-side" ? null : "counter-side")}
        />
        <PieceMesh
          id="counter-side-right"
          center={[width / 2 - thickness / 2, height / 2, 0]}
          size={[thickness, height, depth]}
          selected={selectedPart === "counter-side"}
          onClick={() => onSelect(selectedPart === "counter-side" ? null : "counter-side")}
        />
        <PieceMesh
          id="counter-top"
          center={[0, height - thickness / 2, 0]}
          size={[insideWidth, thickness, depth]}
          selected={selectedPart === "counter-top"}
          onClick={() => onSelect(selectedPart === "counter-top" ? null : "counter-top")}
        />
        <PieceMesh
          id="counter-base"
          center={[0, thickness / 2, 0]}
          size={[insideWidth, thickness, depth]}
          selected={selectedPart === "counter-base"}
          onClick={() => onSelect(selectedPart === "counter-base" ? null : "counter-base")}
        />
      </group>
      <gridHelper
        args={[2.8, 14, "#d0d4d0", "#dde0dc"]}
        position={[0, -height / 2 - 0.012, 0]}
      />
      <ambientLight intensity={0.45} />
      <directionalLight position={[1.8, 2.4, 2]} intensity={1.3} />
    </>
  );
}

function PieceMesh({
  id,
  center,
  size,
  selected,
  onClick,
}: {
  id: string;
  center: [number, number, number];
  size: [number, number, number];
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <mesh position={center} onClick={(event) => { event.stopPropagation(); onClick(); }}>
      <boxGeometry args={size} />
      <meshStandardMaterial
        color={selected ? "#db765e" : id.includes("side") ? "#aa7958" : "#c5966e"}
        roughness={0.78}
        metalness={0}
      />
    </mesh>
  );
}

function PerspectiveCamera({
  position,
}: {
  position: [number, number, number];
}) {
  const { camera } = useThree();
  useEffect(() => {
    camera.position.set(...position);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
  }, [camera, position]);
  return null;
}

function Barcode() {
  const bars = useMemo(
    () =>
      Array.from({ length: 28 }, (_, index) => ({
        x: 2 + index * 3.2,
        width: index % 4 === 0 ? 2 : index % 3 === 0 ? 1.6 : 1,
        height: index % 5 === 0 ? 20 : index % 2 === 0 ? 17 : 14,
      })),
    [],
  );
  return (
    <svg
      className="barcode"
      viewBox="0 0 96 24"
      role="img"
      aria-label="Código visual de referência do projeto"
    >
      <rect width="96" height="24" fill="none" />
      {bars.map((bar, index) => (
        <rect
          key={index}
          x={bar.x}
          y={(24 - bar.height) / 2}
          width={bar.width}
          height={bar.height}
          fill="currentColor"
        />
      ))}
    </svg>
  );
}

function RayzenMark() {
  return (
    <svg viewBox="0 0 34 34" fill="none" aria-hidden="true">
      <path d="M4 5h26v6H10v5h15v6H10v7H4V5Z" fill="currentColor" />
      <path d="M15 16h15v6H15z" fill="currentColor" />
    </svg>
  );
}

function RulerIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="m3 14 11-11 3 3L6 17l-3-3Z" stroke="currentColor" strokeWidth="1.4" />
      <path d="m11 6 2 2M8 9l2 2M5 12l2 2" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}

function CubeIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="m10 2.8 6.5 3.6v7.2L10 17.2l-6.5-3.6V6.4L10 2.8Z" stroke="currentColor" strokeWidth="1.3" />
      <path d="m3.7 6.5 6.3 3.6 6.3-3.6M10 10.1v7" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}

function FrontIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M3 4h14v12H3zM6 4v12m8-12v12" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  );
}

function SideIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M6 3h8v14H6zM9 3v14" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  );
}

function TopIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M3 6h14v8H3zM3 9h14" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M10 2.8v9.1m0 0 3.5-3.5M10 11.9 6.5 8.4M3.5 14v2.5h13V14" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function SaveIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M4 3.5h7.2L16 8.3v8.2H4zM11 3.8v4.7h4.6M6.5 11h7M6.5 13.5h4.5" stroke="currentColor" strokeWidth="1.35" strokeLinejoin="round" />
    </svg>
  );
}

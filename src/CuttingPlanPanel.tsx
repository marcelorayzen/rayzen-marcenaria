import { useEffect, useMemo, useState } from "react";
import type { Part } from "./furnitureEngine";
import {
  createPreliminaryStripPlan,
  reportedWorkshopSheet,
  type CuttingPlanStrategy,
  type CutPartProductionOperation,
  type CuttingSettings,
  type SheetTrim,
} from "./cuttingPlan";
import { createCuttingPlanReport } from "./cuttingPlanReport";
import {
  BrowserCuttingConfiguration,
  type CuttingGrain,
  type LocalCuttingConfiguration,
} from "./browserCuttingConfiguration";
import { createCuttingPieceLabels } from "./cuttingLabels";
import { createCuttingLabelsCsv, createCuttingPlanPackage } from "./cuttingPlanExport";
import { createCuttingMapAnnotations } from "./cuttingMapDimensions";
import { BrowserCuttingPlanArchive } from "./browserCuttingPlanArchive";
import { createGroupedCuttingPlans } from "./groupedCuttingPlan";
import { createGroupedCuttingPlanPackage } from "./groupedCuttingPlanExport";
import {
  BrowserSupplementalCutParts,
  calculatedSupplementalSource,
  createSupplementalDoor15x6,
  manualSupplementalSource,
  type SupplementalCutPart,
} from "./browserSupplementalCutParts";
import type { PanelEdge } from "./compositePanel";

type TrimSide = keyof SheetTrim;

type CuttingPanelPart = Pick<
  Part,
  "id" | "code" | "name" | "material" | "thickness" | "length" | "width" | "quantity" | "edges"
> & {
  grain?: CuttingGrain;
  sourceReference?: string;
  productionOperations?: CutPartProductionOperation[];
};

interface SupplementalPartDraft {
  composition: "single" | "door-15-6";
  code: string;
  name: string;
  material: string;
  thickness: string;
  length: string;
  width: string;
  quantity: string;
  edges: string;
  grain: CuttingGrain;
  sourceReference: string;
  backMaterial: string;
  bandedSides: PanelEdge["side"][];
}

const emptySupplementalDraft: SupplementalPartDraft = {
  composition: "single",
  code: "",
  name: "",
  material: "",
  thickness: "",
  length: "",
  width: "",
  quantity: "1",
  edges: "",
  grain: "pending",
  sourceReference: "",
  backMaterial: "",
  bandedSides: [],
};

const edgeSideLabels: Record<PanelEdge["side"], string> = {
  top: "Superior",
  bottom: "Inferior",
  left: "Esquerda",
  right: "Direita",
};

const trimLabels: Array<[TrimSide, string]> = [
  ["topMm", "Superior"],
  ["rightMm", "Direita"],
  ["bottomMm", "Inferior"],
  ["leftMm", "Esquerda"],
];

const strategyLabels = {
  "largest-side": "Maior lado primeiro",
  area: "Maior área primeiro",
  "strip-width": "Maior faixa primeiro",
} as const;

function parseTrim(value: string): number | null {
  if (!value.trim()) return null;
  return Number(value);
}

function trimInputValue(value: number | null): string {
  return value === null ? "" : String(value);
}

function productionOperationSummary(operations: CutPartProductionOperation[] | undefined): string {
  if (!operations?.length) return "Nenhuma operação adicional registrada";
  return operations.map(operation =>
    `${operation.status === "pending" ? "PENDENTE" : "DEFINIDA"}: ${operation.description}`,
  ).join(" | ");
}

export function CuttingPlanPanel({
  parts,
  project,
  revision,
}: {
  parts: CuttingPanelPart[];
  project: { id: string; title: string };
  revision: number;
}) {
  const configurationStore = useMemo(
    () => new BrowserCuttingConfiguration(
      window.localStorage,
      `rayzen-marcenaria:project:${project.id}:cutting-configuration:v1`,
    ),
    [project.id],
  );
  const initialConfiguration = useMemo(() => configurationStore.load(), [configurationStore]);
  const archiveStore = useMemo(
    () => new BrowserCuttingPlanArchive(
      window.localStorage,
      `rayzen-marcenaria:project:${project.id}:cutting-plan-archive:v1`,
    ),
    [project.id],
  );
  const supplementalStore = useMemo(
    () => new BrowserSupplementalCutParts(
      window.localStorage,
      `rayzen-marcenaria:project:${project.id}:revision:${revision}:supplemental-cut-parts:v1`,
    ),
    [project.id, revision],
  );
  const [archivedPlans, setArchivedPlans] = useState(() => archiveStore.load());
  const [archiveMessage, setArchiveMessage] = useState<string | null>(null);
  const [trim, setTrim] = useState<Record<TrimSide, string>>({
    topMm: initialConfiguration ? trimInputValue(initialConfiguration.trim.topMm) : "4",
    rightMm: initialConfiguration ? trimInputValue(initialConfiguration.trim.rightMm) : "4",
    bottomMm: initialConfiguration ? trimInputValue(initialConfiguration.trim.bottomMm) : "4",
    leftMm: initialConfiguration ? trimInputValue(initialConfiguration.trim.leftMm) : "4",
  });
  const [grain, setGrain] = useState<CuttingGrain>(initialConfiguration?.grain ?? "none");
  const [preferredStrategy, setPreferredStrategy] = useState<CuttingPlanStrategy | null>(
    initialConfiguration?.preferredStrategy ?? null,
  );
  const [preferredStrategies, setPreferredStrategies] = useState<Record<string, CuttingPlanStrategy>>(
    initialConfiguration?.preferredStrategies ?? {},
  );
  const [supplementalParts, setSupplementalParts] = useState<SupplementalCutPart[]>(
    () => supplementalStore.load(),
  );
  const [supplementalDraft, setSupplementalDraft] = useState<SupplementalPartDraft>(emptySupplementalDraft);
  const [supplementalError, setSupplementalError] = useState<string | null>(null);
  const [supplementalMessage, setSupplementalMessage] = useState<string | null>(null);
  const [editingSupplementalId, setEditingSupplementalId] = useState<string | null>(null);
  const [supplementalBasePartId, setSupplementalBasePartId] = useState("");

  useEffect(() => {
    const loaded = configurationStore.load();
    setTrim({
      topMm: loaded ? trimInputValue(loaded.trim.topMm) : "4",
      rightMm: loaded ? trimInputValue(loaded.trim.rightMm) : "4",
      bottomMm: loaded ? trimInputValue(loaded.trim.bottomMm) : "4",
      leftMm: loaded ? trimInputValue(loaded.trim.leftMm) : "4",
    });
    setGrain(loaded?.grain ?? "none");
    setPreferredStrategy(loaded?.preferredStrategy ?? null);
    setPreferredStrategies(loaded?.preferredStrategies ?? {});
  }, [configurationStore]);

  useEffect(() => {
    setSupplementalParts(supplementalStore.load());
    setSupplementalDraft(emptySupplementalDraft);
    setSupplementalError(null);
    setSupplementalMessage(null);
    setEditingSupplementalId(null);
    setSupplementalBasePartId("");
  }, [supplementalStore]);

  function persistConfiguration(
    nextTrim: Record<TrimSide, string>,
    nextGrain: CuttingGrain,
    nextStrategy: CuttingPlanStrategy | null,
    nextStrategies: Record<string, CuttingPlanStrategy>,
  ) {
    const configuration: LocalCuttingConfiguration = {
      version: 1,
      grain: nextGrain,
      trim: {
        topMm: parseTrim(nextTrim.topMm),
        rightMm: parseTrim(nextTrim.rightMm),
        bottomMm: parseTrim(nextTrim.bottomMm),
        leftMm: parseTrim(nextTrim.leftMm),
      },
      preferredStrategy: nextStrategy,
      preferredStrategies: nextStrategies,
    };
    const values = Object.values(configuration.trim);
    if (values.every(value => value === null || (Number.isFinite(value) && value >= 0))) {
      configurationStore.save(configuration);
    }
  }

  function updateTrim(side: TrimSide, value: string) {
    const next = { ...trim, [side]: value };
    setTrim(next);
    persistConfiguration(next, grain, preferredStrategy, preferredStrategies);
  }

  function updateGrain(next: CuttingGrain) {
    setGrain(next);
    persistConfiguration(trim, next, preferredStrategy, preferredStrategies);
  }

  function updateStrategy(groupId: string, next: CuttingPlanStrategy) {
    const nextStrategies = { ...preferredStrategies, [groupId]: next };
    setPreferredStrategy(null);
    setPreferredStrategies(nextStrategies);
    persistConfiguration(trim, grain, null, nextStrategies);
  }

  function resetStrategies() {
    setPreferredStrategy(null);
    setPreferredStrategies({});
    persistConfiguration(trim, grain, null, {});
  }

  function updateSupplementalDraft<K extends keyof SupplementalPartDraft>(
    field: K,
    value: SupplementalPartDraft[K],
  ) {
    setSupplementalDraft(current => ({ ...current, [field]: value }));
  }

  function toggleBandedSide(side: PanelEdge["side"]) {
    setSupplementalDraft(current => ({
      ...current,
      bandedSides: current.bandedSides.includes(side)
        ? current.bandedSides.filter(candidate => candidate !== side)
        : [...current.bandedSides, side],
    }));
  }

  function useCalculatedPartAsBase(partId: string) {
    setSupplementalBasePartId(partId);
    const part = parts.find(candidate => candidate.id === partId);
    if (!part) {
      setSupplementalDraft(emptySupplementalDraft);
      return;
    }
    setSupplementalDraft({
      composition: "single",
      code: part.code,
      name: part.name,
      material: part.material,
      thickness: String(part.thickness),
      length: String(part.length),
      width: String(part.width),
      quantity: String(part.quantity),
      edges: part.edges,
      grain: part.grain ?? grain,
      sourceReference: calculatedSupplementalSource(part.code, revision),
      backMaterial: "",
      bandedSides: [],
    });
    setSupplementalError(null);
    setSupplementalMessage("Dados copiados. Ajuste somente o que muda e salve como peça adicional.");
  }

  function saveSupplementalPart() {
    if (supplementalDraft.composition === "door-15-6") {
      saveCompositeDoor15x6();
      return;
    }
    const part: SupplementalCutPart = {
      id: editingSupplementalId ?? `supplemental-${crypto.randomUUID()}`,
      code: supplementalDraft.code.trim(),
      name: supplementalDraft.name.trim(),
      material: supplementalDraft.material.trim(),
      thickness: Number(supplementalDraft.thickness),
      length: Number(supplementalDraft.length),
      width: Number(supplementalDraft.width),
      quantity: Number(supplementalDraft.quantity),
      edges: supplementalDraft.edges.trim(),
      grain: supplementalDraft.grain,
      sourceReference: supplementalDraft.sourceReference.trim() || manualSupplementalSource(revision),
    };
    try {
      const nextParts = editingSupplementalId
        ? supplementalParts.map(current => current.id === editingSupplementalId ? part : current)
        : [...supplementalParts, part];
      const next = supplementalStore.save(nextParts);
      setSupplementalParts(next);
      setSupplementalDraft(emptySupplementalDraft);
      setSupplementalError(null);
      setSupplementalMessage(editingSupplementalId
        ? "Alteração salva. A peça manteve o mesmo ID técnico."
        : "Peça adicionada. Use Editar na lista abaixo para alterá-la.");
      setEditingSupplementalId(null);
      setSupplementalBasePartId("");
    } catch (error) {
      setSupplementalError(error instanceof Error ? error.message : "Não foi possível salvar a peça complementar.");
    }
  }

  function saveCompositeDoor15x6() {
    if (!supplementalDraft.code.trim() || !supplementalDraft.name.trim()) {
      setSupplementalError("Informe o código e o nome da porta composta.");
      setSupplementalMessage(null);
      return;
    }
    const editingCompositeId = editingSupplementalId?.startsWith("composite:")
      ? editingSupplementalId.slice("composite:".length)
      : null;
    const compositeId = editingCompositeId ?? `door-15-6-${crypto.randomUUID()}`;
    const sourceReference = supplementalDraft.sourceReference.trim() || manualSupplementalSource(revision);
    const currentCompositeParts = supplementalParts.filter(part => part.composite?.id === compositeId);
    const idByLayer = new Map(currentCompositeParts.map(part => [part.composite?.layer, part.id]));
    const result = createSupplementalDoor15x6({
      compositeId,
      frontId: idByLayer.get("front-15") ?? `supplemental-${crypto.randomUUID()}`,
      backId: idByLayer.get("back-6") ?? `supplemental-${crypto.randomUUID()}`,
      revisionId: `R${String(revision).padStart(2, "0")}`,
      sourceReference,
      code: supplementalDraft.code,
      name: supplementalDraft.name,
      quantity: Number(supplementalDraft.quantity),
      lengthMm: Number(supplementalDraft.length),
      widthMm: Number(supplementalDraft.width),
      frontMaterialId: supplementalDraft.material.trim(),
      backMaterialId: supplementalDraft.backMaterial.trim(),
      grain: supplementalDraft.grain,
      bandedSides: supplementalDraft.bandedSides,
    });
    if (!result.ok) {
      setSupplementalError(result.errors.join(" "));
      setSupplementalMessage(null);
      return;
    }
    try {
      const withoutCurrent = supplementalParts.filter(part => part.composite?.id !== compositeId);
      const next = supplementalStore.save([...withoutCurrent, ...result.parts]);
      setSupplementalParts(next);
      setSupplementalDraft(emptySupplementalDraft);
      setSupplementalError(null);
      setSupplementalMessage(editingCompositeId
        ? "Composição 15+6 atualizada. As duas camadas mantiveram seus IDs técnicos."
        : "Porta 15+6 criada: duas camadas com as mesmas medidas foram enviadas ao plano de corte.");
      setEditingSupplementalId(null);
      setSupplementalBasePartId("");
    } catch (error) {
      setSupplementalError(error instanceof Error ? error.message : "Não foi possível salvar a composição 15+6.");
      setSupplementalMessage(null);
    }
  }

  function editSupplementalPart(part: SupplementalCutPart) {
    if (part.composite?.kind === "door-15-6") {
      const group = supplementalParts.filter(candidate => candidate.composite?.id === part.composite?.id);
      const front = group.find(candidate => candidate.composite?.layer === "front-15");
      const back = group.find(candidate => candidate.composite?.layer === "back-6");
      if (!front || !back) {
        setSupplementalError("A composição 15+6 está incompleta e não pode ser editada.");
        return;
      }
      setEditingSupplementalId(`composite:${part.composite.id}`);
      setSupplementalDraft({
        composition: "door-15-6",
        code: front.code.replace(/-15$/, ""),
        name: front.name.replace(/ · frente 15 mm$/, ""),
        material: front.material,
        thickness: "21",
        length: String(front.length),
        width: String(front.width),
        quantity: String(front.quantity),
        edges: front.edges,
        grain: front.grain,
        sourceReference: front.sourceReference,
        backMaterial: back.material,
        bandedSides: [...part.composite.bandedSides],
      });
      setSupplementalError(null);
      setSupplementalMessage("Editando a composição inteira. Salvar atualizará juntas as camadas de 15 mm e 6 mm.");
      setSupplementalBasePartId("");
      return;
    }
    setEditingSupplementalId(part.id);
    setSupplementalDraft({
      composition: "single",
      code: part.code,
      name: part.name,
      material: part.material,
      thickness: String(part.thickness),
      length: String(part.length),
      width: String(part.width),
      quantity: String(part.quantity),
      edges: part.edges,
      grain: part.grain,
      sourceReference: part.sourceReference,
      backMaterial: "",
      bandedSides: [],
    });
    setSupplementalError(null);
    setSupplementalMessage("Editando a peça selecionada. Salve ou cancele a alteração.");
    setSupplementalBasePartId("");
  }

  function cancelSupplementalEdit() {
    setEditingSupplementalId(null);
    setSupplementalDraft(emptySupplementalDraft);
    setSupplementalError(null);
    setSupplementalMessage(null);
    setSupplementalBasePartId("");
  }

  function removeSupplementalPart(id: string) {
    const selected = supplementalParts.find(part => part.id === id);
    const nextParts = selected?.composite
      ? supplementalParts.filter(part => part.composite?.id !== selected.composite?.id)
      : supplementalParts.filter(part => part.id !== id);
    const next = supplementalStore.save(nextParts);
    setSupplementalParts(next);
    setSupplementalError(null);
    setSupplementalMessage("Peça removida desta revisão local.");
    if (editingSupplementalId === id) cancelSupplementalEdit();
  }

  const calculation = useMemo(() => {
    const allParts: CuttingPanelPart[] = [...parts, ...supplementalParts];
    if (allParts.length === 0) return null;
    const settings: CuttingSettings = {
      kerfMm: 3,
      trim: {
        topMm: parseTrim(trim.topMm),
        rightMm: parseTrim(trim.rightMm),
        bottomMm: parseTrim(trim.bottomMm),
        leftMm: parseTrim(trim.leftMm),
      },
    };
    const cutParts = allParts.map(part => ({
        id: part.id,
        materialId: part.material,
        thicknessMm: part.thickness,
        lengthMm: part.length,
        widthMm: part.width,
        quantity: part.quantity,
        grain: part.grain ?? grain,
        allowRotation: (part.grain ?? grain) === "none",
        sourceReference: part.sourceReference ?? "Módulo paramétrico da revisão salva",
        productionOperations: part.productionOperations?.map(operation => ({ ...operation })),
      }));
    const grouped = createGroupedCuttingPlans(
      {
        lengthMm: reportedWorkshopSheet.lengthMm,
        widthMm: reportedWorkshopSheet.widthMm,
        grain,
      },
      settings,
      cutParts,
    );
    if (!grouped.ok) return { settings, grouped, artifacts: [], portablePackage: null };
    const labelParts = allParts.map(part => ({
      id: part.id,
      code: part.code,
      name: part.name,
      material: part.material,
      thicknessMm: part.thickness,
      edges: part.edges,
      sourceReference: part.sourceReference ?? "Módulo paramétrico da revisão salva",
      productionOperations: part.productionOperations?.map(operation => ({ ...operation })),
    }));
    const artifacts = grouped.groups.map(group => {
      const groupStrategy = preferredStrategies[group.id] ?? preferredStrategy;
      const preferredPlan = groupStrategy
        ? createPreliminaryStripPlan(group.stock, settings, group.parts, groupStrategy)
        : null;
      const plan = preferredPlan?.ok ? preferredPlan : group.comparison.selectedPlan;
      const report = createCuttingPlanReport(project, revision, group.stock, settings, group.parts, plan);
      const partIds = new Set(group.parts.map(part => part.id));
      const labels = createCuttingPieceLabels(
        project,
        revision,
        labelParts.filter(part => partIds.has(part.id)),
        plan,
      );
      const singlePackage = report.ok && labels.ok
        ? createCuttingPlanPackage(report.report, labels.labels)
        : null;
      return { ...group, plan, report, labels, singlePackage };
    });
    const singlePackages = artifacts.flatMap(artifact =>
      artifact.singlePackage?.ok ? [artifact.singlePackage.package] : [],
    );
    const portablePackage = singlePackages.length === artifacts.length
      ? createGroupedCuttingPlanPackage(singlePackages)
      : null;
    return {
      settings,
      grouped,
      artifacts,
      portablePackage,
    };
  }, [grain, parts, preferredStrategies, preferredStrategy, project.id, project.title, revision, supplementalParts, trim.bottomMm, trim.leftMm, trim.rightMm, trim.topMm]);
  const artifacts = calculation?.artifacts ?? [];
  const labels = artifacts.flatMap(artifact => artifact.labels.ok ? artifact.labels.labels : []);
  const portablePackage = calculation?.portablePackage ?? null;
  const totalSheets = artifacts.reduce((sum, artifact) => sum + artifact.plan.sheets.length, 0);
  const reportReady = artifacts.length > 0 && artifacts.every(artifact => artifact.report.ok);

  function downloadText(filename: string, content: string, type: string) {
    const url = URL.createObjectURL(new Blob([content], { type }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
  }

  function downloadPackage() {
    if (!portablePackage?.ok) return;
    downloadText(
      `rayzen-plano-corte-${project.id}-r${revision}.json`,
      JSON.stringify(portablePackage.package, null, 2),
      "application/json;charset=utf-8",
    );
  }

  function downloadLabelsCsv() {
    if (!portablePackage?.ok) return;
    downloadText(
      `rayzen-etiquetas-${project.id}-r${revision}.csv`,
      `\uFEFF${createCuttingLabelsCsv(labels)}`,
      "text/csv;charset=utf-8",
    );
  }

  function archiveCurrentPlan() {
    if (!portablePackage?.ok) return;
    const savedAt = new Date().toISOString();
    const next = archiveStore.save({
      id: `cutting-plan-${project.id}-r${revision}-${crypto.randomUUID()}`,
      savedAt,
      package: portablePackage.package,
    });
    setArchivedPlans(next);
    setArchiveMessage(`Plano preliminar R${String(revision).padStart(2, "0")} arquivado neste dispositivo.`);
  }

  return (
    <section className="cutting-plan-section" aria-labelledby="cutting-plan-title">
      <header className="cutting-plan-heading">
        <div>
          <span className="small-label">PRODUÇÃO · PRÉVIA</span>
          <h2 id="cutting-plan-title">Distribuição nas chapas</h2>
          <p>Chapa 2750 × 1850 mm · serra 3 mm · revisão R{String(revision).padStart(2, "0")}</p>
        </div>
        <div className="cutting-plan-actions">
          <strong>{reportReady ? `${totalSheets} CHAPA(S) · ${artifacts.length} GRUPO(S)` : "CONFIGURAÇÃO PENDENTE"}</strong>
          <button type="button" disabled={!portablePackage?.ok} onClick={archiveCurrentPlan}>Salvar plano</button>
          <button type="button" disabled={!portablePackage?.ok} onClick={downloadPackage}>Baixar JSON</button>
          <button type="button" disabled={!portablePackage?.ok} onClick={downloadLabelsCsv}>Etiquetas CSV</button>
          <button type="button" disabled={!reportReady} onClick={() => window.print()}>Imprimir relatório</button>
        </div>
      </header>

      {reportReady ? (
        <div className="cutting-report-identity">
          <div><span>Projeto</span><strong>{project.title}</strong><small>{project.id}</small></div>
          <div><span>Revisão</span><strong>R{String(revision).padStart(2, "0")}</strong></div>
          <div><span>Materiais/esp.</span><strong>{artifacts.length} GRUPO(S)</strong></div>
          <div><span>Status</span><strong>PRELIMINAR · NÃO LIBERADO</strong></div>
        </div>
      ) : null}
      {archivedPlans.length > 0 || archiveMessage ? (
        <p className="cutting-plan-archive-status">
          {archiveMessage ?? `${archivedPlans.length} plano(s) preliminar(es) arquivado(s) neste dispositivo.`}
          {archivedPlans[0] ? ` Último: R${String(archivedPlans[0].package.revision).padStart(2, "0")} · ${new Date(archivedPlans[0].savedAt).toLocaleString("pt-BR")}.` : ""}
        </p>
      ) : null}

      <section className="supplemental-parts" aria-labelledby="supplemental-parts-title">
        <header>
          <div>
            <span className="small-label">ENTRADA COMPLEMENTAR · REVISÃO SALVA</span>
            <h3 id="supplemental-parts-title">Peças adicionais para o corte</h3>
          </div>
          <span>{supplementalParts.length} ITEM(NS)</span>
        </header>
        <p>
          As peças calculadas do móvel já entram automaticamente no plano. Use esta área somente para uma nova camada, porta ou peça que ainda não existe no módulo; ela fica neste dispositivo e nesta revisão.
        </p>
        <label className="supplemental-base-selector">
          Reaproveitar uma peça calculada como base
          <select value={supplementalBasePartId} onChange={event => useCalculatedPartAsBase(event.target.value)}>
            <option value="">Começar uma peça adicional em branco</option>
            {parts.map(part => (
              <option value={part.id} key={part.id}>{part.code} · {part.name} · {part.length} × {part.width} × {part.thickness} mm</option>
            ))}
          </select>
        </label>
        <div className="supplemental-parts-form">
          <label className="supplemental-wide">Tipo de peça<select value={supplementalDraft.composition} onChange={event => updateSupplementalDraft("composition", event.target.value as SupplementalPartDraft["composition"])}>
            <option value="single">Peça retangular simples</option>
            <option value="door-15-6">Porta composta 15 + 6 mm · medidas iguais</option>
          </select></label>
          <label>Código<input value={supplementalDraft.code} onChange={event => updateSupplementalDraft("code", event.target.value)} /></label>
          <label>Nome<input value={supplementalDraft.name} onChange={event => updateSupplementalDraft("name", event.target.value)} /></label>
          <label>{supplementalDraft.composition === "door-15-6" ? "Material frente 15 mm" : "Material"}<input value={supplementalDraft.material} onChange={event => updateSupplementalDraft("material", event.target.value)} /></label>
          {supplementalDraft.composition === "door-15-6" ? (
            <label>Material costas 6 mm<input value={supplementalDraft.backMaterial} onChange={event => updateSupplementalDraft("backMaterial", event.target.value)} /></label>
          ) : (
            <label>Espessura<span><input type="number" min="0.1" step="0.1" value={supplementalDraft.thickness} onChange={event => updateSupplementalDraft("thickness", event.target.value)} /> mm</span></label>
          )}
          <label>Comprimento<span><input type="number" min="1" step="1" value={supplementalDraft.length} onChange={event => updateSupplementalDraft("length", event.target.value)} /> mm</span></label>
          <label>Largura<span><input type="number" min="1" step="1" value={supplementalDraft.width} onChange={event => updateSupplementalDraft("width", event.target.value)} /> mm</span></label>
          <label>Quantidade<input type="number" min="1" step="1" value={supplementalDraft.quantity} onChange={event => updateSupplementalDraft("quantity", event.target.value)} /></label>
          <label>Veio<select value={supplementalDraft.grain} onChange={event => updateSupplementalDraft("grain", event.target.value as CuttingGrain)}>
            <option value="pending">Definir antes de calcular</option>
            <option value="none">Sem veio</option>
            <option value="length">No comprimento</option>
            <option value="width">Na largura</option>
          </select></label>
          {supplementalDraft.composition === "door-15-6" ? (
            <fieldset className="supplemental-edge-sides">
              <legend>Lados com fita 22 mm após composição</legend>
              {(Object.keys(edgeSideLabels) as PanelEdge["side"][]).map(side => (
                <label key={side}><input type="checkbox" checked={supplementalDraft.bandedSides.includes(side)} onChange={() => toggleBandedSide(side)} />{edgeSideLabels[side]}</label>
              ))}
            </fieldset>
          ) : (
            <label className="supplemental-wide">Bordas / fita<input value={supplementalDraft.edges} onChange={event => updateSupplementalDraft("edges", event.target.value)} placeholder="Descreva somente o que foi definido" /></label>
          )}
          <label className="supplemental-wide">Origem da informação · opcional<input value={supplementalDraft.sourceReference} onChange={event => updateSupplementalDraft("sourceReference", event.target.value)} placeholder={`Se vazio: entrada manual da revisão R${String(revision).padStart(2, "0")}`} /></label>
          <button type="button" onClick={saveSupplementalPart}>{editingSupplementalId ? "Salvar alteração" : supplementalDraft.composition === "door-15-6" ? "Gerar porta 15+6" : "Adicionar peça"}</button>
          {editingSupplementalId ? <button type="button" className="supplemental-secondary" onClick={cancelSupplementalEdit}>Cancelar edição</button> : null}
        </div>
        {supplementalError ? <p className="supplemental-parts-error" role="alert">{supplementalError}</p> : null}
        {supplementalMessage ? <p className="supplemental-parts-success" role="status">{supplementalMessage}</p> : null}
        {supplementalParts.length > 0 ? (
          <div className="supplemental-parts-list">
            {supplementalParts.map(part => (
              <article key={part.id}>
                <div>
                  <strong>{part.code} · {part.name}</strong>
                  <span>{part.quantity} × {part.length} × {part.width} mm · {part.material} · {part.thickness} mm</span>
                  <small>{part.edges} · origem: {part.sourceReference}{part.composite ? " · composição 15+6" : ""}</small>
                </div>
                <div className="supplemental-part-actions">
                  <button type="button" onClick={() => editSupplementalPart(part)}>Editar</button>
                  <button type="button" onClick={() => removeSupplementalPart(part.id)}>{part.composite ? "Remover composição" : "Remover"}</button>
                </div>
              </article>
            ))}
          </div>
        ) : null}
      </section>

      <div className="cutting-settings">
        <label>
          Sentido do veio
          <select value={grain} onChange={event => updateGrain(event.target.value as CuttingGrain)}>
            <option value="none">Sem veio</option>
            <option value="length">No comprimento</option>
            <option value="width">Na largura</option>
            <option value="pending">Pendente</option>
          </select>
        </label>
        {trimLabels.map(([side, label]) => (
          <label key={side}>
            Refilo {label}
            <span><input
              type="number"
              min="0"
              step="1"
              value={trim[side]}
              onChange={event => updateTrim(side, event.target.value)}
            /> mm</span>
          </label>
        ))}
      </div>
      <p className="cutting-local-status">Configuração salva neste dispositivo para este projeto.</p>

      {artifacts.map(artifact => (
        <section className="cutting-group-strategies" key={`strategy-${artifact.id}`}>
          <h3>{artifact.materialId} · {artifact.thicknessMm} mm</h3>
          <div className="cutting-alternatives" aria-label={`Comparação de estratégias para ${artifact.materialId} ${artifact.thicknessMm} mm`}>
            {artifact.comparison.alternatives.map(alternative => (
              <button
                type="button"
                key={alternative.strategy}
                className={artifact.plan.strategy === alternative.strategy ? "selected" : ""}
                onClick={() => updateStrategy(artifact.id, alternative.strategy)}
              >
                <span>{strategyLabels[alternative.strategy]}</span>
                <strong>{alternative.sheetCount} chapa(s)</strong>
                <small>{alternative.operationCount} operações · desperdício {(alternative.wasteAreaMm2 / 1_000_000).toFixed(2)} m²</small>
                {alternative.selected ? <em>RECOMENDADA</em> : null}
              </button>
            ))}
          </div>
        </section>
      ))}
      {artifacts.length > 0 ? (
        <button type="button" className="cutting-strategy-auto" disabled={preferredStrategy === null && Object.keys(preferredStrategies).length === 0} onClick={resetStrategies}>
          Usar seleção automática por grupo
        </button>
      ) : null}

      {!calculation ? <p className="cutting-plan-warning">A revisão não contém peças calculadas.</p> : null}
      {calculation && !calculation.grouped.ok ? (
        <div className="cutting-plan-warning" role="alert">
          {[...calculation.grouped.errors, ...calculation.grouped.pending].map(message => <p key={message}>{message}</p>)}
        </div>
      ) : null}

      {artifacts.map(artifact => (
        <section className="cutting-material-group" key={`sheets-${artifact.id}`}>
          <header className="cutting-material-heading">
            <div>
              <span className="small-label">MATERIAL / ESPESSURA</span>
              <h3>{artifact.materialId} · {artifact.thicknessMm} mm</h3>
            </div>
            <span>{strategyLabels[artifact.plan.strategy]} · {artifact.plan.sheets.length} chapa(s)</span>
          </header>
          <div className="cutting-sheet-list">
          {artifact.plan.sheets.map(sheet => {
            const utilization = sheet.usableAreaMm2 > 0
              ? (sheet.usedPartAreaMm2 / sheet.usableAreaMm2) * 100
              : 0;
            const dimensionResult = calculation
              ? createCuttingMapAnnotations(artifact.stock, calculation.settings, sheet)
              : null;
            const annotations = dimensionResult?.ok ? dimensionResult.annotations : null;
            return (
              <article className="cutting-sheet-card" key={`${artifact.id}-${sheet.number}`}>
                <div>
                  <strong>Chapa {sheet.number}</strong>
                  <span>{sheet.placements.length} peças · {utilization.toFixed(1)}% da área útil em peças</span>
                </div>
                {annotations ? (
                  <div className="cutting-map-summary">
                    <span>Chapa {artifact.stock.lengthMm} × {artifact.stock.widthMm} mm</span>
                    <span>Área útil {annotations.usableArea.width} × {annotations.usableArea.height} mm</span>
                    <span>Refilos S {calculation!.settings.trim.topMm} · D {calculation!.settings.trim.rightMm} · I {calculation!.settings.trim.bottomMm} · E {calculation!.settings.trim.leftMm} mm</span>
                    <span>Serra {calculation!.settings.kerfMm} mm</span>
                  </div>
                ) : null}
                <svg
                  className="cutting-sheet-map"
                  viewBox="0 0 2750 1850"
                  role="img"
                  aria-label={`Distribuição preliminar de ${artifact.materialId} ${artifact.thicknessMm} mm, chapa ${sheet.number}`}
                >
                  <rect className="cutting-sheet-stock" x="0" y="0" width="2750" height="1850" />
                  {annotations ? (
                    <rect
                      className="cutting-usable-area"
                      x={annotations.usableArea.x}
                      y={annotations.usableArea.y}
                      width={annotations.usableArea.width}
                      height={annotations.usableArea.height}
                    />
                  ) : null}
                  {sheet.placements.map(placement => (
                    <g key={placement.id}>
                      <rect
                        className="cutting-part-rect"
                        x={placement.xMm}
                        y={placement.yMm}
                        width={placement.lengthMm}
                        height={placement.widthMm}
                      />
                      <text
                        className="cutting-part-label"
                        x={placement.xMm + 18}
                        y={placement.yMm + 92}
                      >
                        {placement.partId} #{placement.instance} · {placement.lengthMm}×{placement.widthMm}
                      </text>
                      <text className="cutting-part-coordinate" x={placement.xMm + 18} y={placement.yMm + 126}>
                        X {placement.xMm} · Y {placement.yMm}{placement.rotated ? " · GIRADA" : ""}
                      </text>
                    </g>
                  ))}
                  {annotations?.dimensions.filter(dimension => dimension.scope === "part").map(dimension => {
                    const middleX = (dimension.x1 + dimension.x2) / 2;
                    const middleY = (dimension.y1 + dimension.y2) / 2;
                    const tick = 14;
                    return (
                      <g key={dimension.id} className={`cutting-dimension cutting-dimension-${dimension.scope}`}>
                        <line x1={dimension.x1} y1={dimension.y1} x2={dimension.x2} y2={dimension.y2} />
                        {dimension.axis === "horizontal" ? (
                          <>
                            <line x1={dimension.x1} y1={dimension.y1 - tick} x2={dimension.x1} y2={dimension.y1 + tick} />
                            <line x1={dimension.x2} y1={dimension.y2 - tick} x2={dimension.x2} y2={dimension.y2 + tick} />
                          </>
                        ) : (
                          <>
                            <line x1={dimension.x1 - tick} y1={dimension.y1} x2={dimension.x1 + tick} y2={dimension.y1} />
                            <line x1={dimension.x2 - tick} y1={dimension.y2} x2={dimension.x2 + tick} y2={dimension.y2} />
                          </>
                        )}
                        <text
                          x={middleX}
                          y={middleY - 10}
                          transform={dimension.axis === "vertical" ? `rotate(-90 ${middleX} ${middleY})` : undefined}
                        >{dimension.label}</text>
                      </g>
                    );
                  })}
                </svg>
                <details className="cutting-operations">
                  <summary>Ver operações preliminares</summary>
                  <ol>
                    {sheet.operations.map(operation => (
                      <li key={operation.sequence}>
                        <span>{operation.sequence}</span>
                        <span>{operation.label}</span>
                      </li>
                    ))}
                  </ol>
                </details>
              </article>
            );
          })}
          </div>

          {artifact.report.ok ? (
            <div className="cutting-report-parts">
              <h3>Peças consideradas · {artifact.materialId} · {artifact.thicknessMm} mm</h3>
              <table>
                <thead><tr><th>Peça</th><th>Qtd.</th><th>Dimensões</th><th>Material</th><th>Esp.</th><th>Origem</th><th>Operações</th></tr></thead>
                <tbody>{artifact.report.report.parts.map(part => (
                  <tr key={part.id}>
                    <td>{part.id}</td><td>{part.quantity}</td><td>{part.lengthMm} × {part.widthMm} mm</td>
                    <td>{part.materialId}</td><td>{part.thicknessMm} mm</td><td>{part.sourceReference ?? "Não registrada"}</td>
                    <td>{productionOperationSummary(part.productionOperations)}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          ) : null}
        </section>
      ))}

      {labels.length > 0 ? (
        <div className="cutting-labels-section">
          <h3>Etiquetas preliminares</h3>
          <div className="cutting-label-grid">
            {labels.map(label => (
              <article key={label.id} className="cutting-piece-label">
                <header><strong>{label.partCode} · {label.partName}</strong><span>R{String(label.revision).padStart(2, "0")}</span></header>
                <p>{label.projectTitle}</p>
                <dl>
                  <div><dt>Peça</dt><dd>{label.instance}</dd></div>
                  <div><dt>Chapa</dt><dd>{label.sheetNumber}</dd></div>
                  <div><dt>Medida</dt><dd>{label.lengthMm} × {label.widthMm} mm</dd></div>
                  <div><dt>Espessura</dt><dd>{label.thicknessMm} mm</dd></div>
                  <div><dt>Material</dt><dd>{label.material}</dd></div>
                  <div><dt>Bordas</dt><dd>{label.edges}</dd></div>
                  <div><dt>Origem</dt><dd>{label.sourceReference ?? "Não registrada"}</dd></div>
                  <div><dt>Operações</dt><dd>{productionOperationSummary(label.productionOperations)}</dd></div>
                </dl>
                <small>PRELIMINAR · NÃO LIBERADO{label.rotatedInPlan ? " · GIRADA NO MAPA" : ""}</small>
              </article>
            ))}
          </div>
        </div>
      ) : null}

      <p className="cutting-plan-note">
        Prévia em faixas para conferência. Ainda não representa sequência de cortes nem revisão liberada para fabricação.
      </p>
    </section>
  );
}

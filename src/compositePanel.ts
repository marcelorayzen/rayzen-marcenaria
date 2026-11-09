/** A project-specific stack; dimensions describe each blank before machining. */
export interface PanelLayer {
  id: string;
  materialId: string;
  thicknessMm: number;
  cutLengthMm: number;
  cutWidthMm: number;
  grain: "length" | "width" | "none" | "pending";
}

export interface PanelEdge {
  side: "top" | "bottom" | "left" | "right";
  bandWidthMm: number;
  bandThicknessMm: number | null;
}

/** Widths reported as commonly available in the workshop; not a closed catalog. */
export const reportedWorkshopBandWidthsMm = [22, 35, 45, 60] as const;

export interface CompositePanel {
  id: string;
  revisionId: string;
  sourceReference: string;
  quantity: number;
  layers: PanelLayer[];
  edges: PanelEdge[];
  operations: Array<{
    id: string;
    kind: "bonding" | "handle-groove" | "edge-banding";
    layerIds: string[];
    specificationReference: string | null;
  }>;
}

export interface PanelCutBlank extends PanelLayer {
  id: string;
  panelId: string;
  layerId: string;
  revisionId: string;
  instance: number;
}

export type PanelExpansion =
  | { ok: false; errors: string[] }
  | { ok: true; nominalThicknessMm: number; blanks: PanelCutBlank[]; pending: string[] };

/** Expands blanks only. Neither machining geometry nor production release is inferred. */
export function expandCompositePanel(panel: CompositePanel): PanelExpansion {
  const errors: string[] = [];
  const pending: string[] = [];
  const positive = (value: number) => Number.isFinite(value) && value > 0;
  if (![panel.id, panel.revisionId, panel.sourceReference].every(value => value.trim())) {
    errors.push("Identifique peça, revisão e origem.");
  }
  if (!Number.isSafeInteger(panel.quantity) || panel.quantity <= 0) {
    errors.push("Quantidade deve ser um inteiro positivo.");
  }
  if (panel.layers.length === 0) errors.push("Informe pelo menos uma camada.");
  const layerIds = new Set<string>();
  for (const layer of panel.layers) {
    if (!layer.id.trim() || layerIds.has(layer.id)) errors.push("Camadas precisam de IDs únicos.");
    layerIds.add(layer.id);
    if (!layer.materialId.trim()) errors.push("Informe o material de cada camada.");
    if (![layer.thicknessMm, layer.cutLengthMm, layer.cutWidthMm].every(positive)) {
      errors.push("Dimensões das camadas devem ser positivas e finitas.");
    }
    if (!["length", "width", "none", "pending"].includes(layer.grain)) errors.push("Sentido do veio inválido.");
    if (layer.grain === "pending") pending.push(`Definir veio da camada ${layer.id}.`);
  }
  const nominalThicknessMm = panel.layers.reduce((sum, layer) => sum + layer.thicknessMm, 0);
  if (!Number.isFinite(nominalThicknessMm)) errors.push("Espessura composta inválida.");
  const sides = new Set<string>();
  for (const edge of panel.edges) {
    if (!["top", "bottom", "left", "right"].includes(edge.side) || sides.has(edge.side)) {
      errors.push("Identifique cada borda uma única vez.");
    }
    sides.add(edge.side);
    if (!positive(edge.bandWidthMm) || edge.bandWidthMm < nominalThicknessMm) {
      errors.push("A largura da fita precisa cobrir a espessura nominal composta.");
    }
    if (edge.bandThicknessMm === null) pending.push(`Definir espessura da fita em ${edge.side}.`);
    else if (!positive(edge.bandThicknessMm)) errors.push("Espessura de fita inválida.");
  }
  const operationIds = new Set<string>();
  for (const operation of panel.operations) {
    if (!operation.id.trim() || operationIds.has(operation.id)) errors.push("Operações precisam de IDs únicos.");
    operationIds.add(operation.id);
    if (!["bonding", "handle-groove", "edge-banding"].includes(operation.kind)) errors.push("Operação inválida.");
    if (!operation.layerIds.length || operation.layerIds.some(id => !layerIds.has(id))) {
      errors.push("Operação deve referenciar camadas existentes.");
    }
    if (!operation.specificationReference?.trim()) pending.push(`Detalhar operação ${operation.id}.`);
  }
  if (errors.length) return { ok: false, errors };
  const blanks: PanelCutBlank[] = [];
  for (let instance = 1; instance <= panel.quantity; instance += 1) {
    for (const layer of panel.layers) {
      blanks.push({
        ...layer,
        id: JSON.stringify([panel.id, instance, layer.id]),
        panelId: panel.id,
        layerId: layer.id,
        revisionId: panel.revisionId,
        instance,
      });
    }
  }
  return { ok: true, nominalThicknessMm, blanks, pending };
}

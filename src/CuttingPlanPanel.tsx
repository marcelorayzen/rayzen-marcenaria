import { useMemo, useState } from "react";
import type { Part } from "./furnitureEngine";
import {
  comparePreliminaryStripPlans,
  createPreliminaryStripPlan,
  reportedWorkshopSheet,
  type CuttingPlanStrategy,
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

type TrimSide = keyof SheetTrim;

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

export function CuttingPlanPanel({
  parts,
  project,
  revision,
}: {
  parts: Part[];
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

  function persistConfiguration(
    nextTrim: Record<TrimSide, string>,
    nextGrain: CuttingGrain,
    nextStrategy: CuttingPlanStrategy | null,
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
    };
    const values = Object.values(configuration.trim);
    if (values.every(value => value === null || (Number.isFinite(value) && value >= 0))) {
      configurationStore.save(configuration);
    }
  }

  function updateTrim(side: TrimSide, value: string) {
    const next = { ...trim, [side]: value };
    setTrim(next);
    persistConfiguration(next, grain, preferredStrategy);
  }

  function updateGrain(next: CuttingGrain) {
    setGrain(next);
    persistConfiguration(trim, next, preferredStrategy);
  }

  function updateStrategy(next: CuttingPlanStrategy | null) {
    setPreferredStrategy(next);
    persistConfiguration(trim, grain, next);
  }

  const calculation = useMemo(() => {
    const first = parts[0];
    if (!first) return null;
    const settings: CuttingSettings = {
      kerfMm: 3,
      trim: {
        topMm: parseTrim(trim.topMm),
        rightMm: parseTrim(trim.rightMm),
        bottomMm: parseTrim(trim.bottomMm),
        leftMm: parseTrim(trim.leftMm),
      },
    };
    const stock = {
      ...reportedWorkshopSheet,
      materialId: first.material,
      thicknessMm: first.thickness,
      grain,
    };
    const cutParts = parts.map(part => ({
        id: part.id,
        materialId: part.material,
        thicknessMm: part.thickness,
        lengthMm: part.length,
        widthMm: part.width,
        quantity: part.quantity,
        grain,
        allowRotation: grain === "none",
      }));
    const comparison = comparePreliminaryStripPlans(stock, settings, cutParts);
    const preferredPlan = comparison.ok && preferredStrategy
      ? createPreliminaryStripPlan(stock, settings, cutParts, preferredStrategy)
      : null;
    const plan = preferredPlan?.ok
      ? preferredPlan
      : comparison.ok ? comparison.selectedPlan : comparison.plan;
    return {
      plan,
      comparison,
      stock,
      settings,
      report: createCuttingPlanReport(project, revision, stock, settings, cutParts, plan),
      labels: createCuttingPieceLabels(
        project,
        revision,
        parts.map(part => ({
          id: part.id,
          code: part.code,
          name: part.name,
          material: part.material,
          thicknessMm: part.thickness,
          edges: part.edges,
        })),
        plan,
      ),
    };
  }, [grain, parts, preferredStrategy, project.id, project.title, revision, trim.bottomMm, trim.leftMm, trim.rightMm, trim.topMm]);
  const plan = calculation?.plan ?? null;
  const report = calculation?.report.ok ? calculation.report.report : null;
  const labels = calculation?.labels.ok ? calculation.labels.labels : [];
  const portablePackage = report ? createCuttingPlanPackage(report, labels) : null;

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
          <strong>{plan?.ok ? `${plan.sheets.length} CHAPA(S)` : "CONFIGURAÇÃO PENDENTE"}</strong>
          <button type="button" disabled={!portablePackage?.ok} onClick={archiveCurrentPlan}>Salvar plano</button>
          <button type="button" disabled={!portablePackage?.ok} onClick={downloadPackage}>Baixar JSON</button>
          <button type="button" disabled={!portablePackage?.ok} onClick={downloadLabelsCsv}>Etiquetas CSV</button>
          <button type="button" disabled={!report} onClick={() => window.print()}>Imprimir relatório</button>
        </div>
      </header>

      {report ? (
        <div className="cutting-report-identity">
          <div><span>Projeto</span><strong>{report.project.title}</strong><small>{report.project.id}</small></div>
          <div><span>Revisão</span><strong>R{String(report.revision).padStart(2, "0")}</strong></div>
          <div><span>Estratégia</span><strong>{strategyLabels[report.strategy]}</strong></div>
          <div><span>Status</span><strong>PRELIMINAR · NÃO LIBERADO</strong></div>
        </div>
      ) : null}
      {archivedPlans.length > 0 || archiveMessage ? (
        <p className="cutting-plan-archive-status">
          {archiveMessage ?? `${archivedPlans.length} plano(s) preliminar(es) arquivado(s) neste dispositivo.`}
          {archivedPlans[0] ? ` Último: R${String(archivedPlans[0].package.revision).padStart(2, "0")} · ${new Date(archivedPlans[0].savedAt).toLocaleString("pt-BR")}.` : ""}
        </p>
      ) : null}

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

      {calculation?.comparison.ok ? (
        <div className="cutting-alternatives" aria-label="Comparação de estratégias preliminares">
          {calculation.comparison.alternatives.map(alternative => (
            <button
              type="button"
              key={alternative.strategy}
              className={plan?.ok && plan.strategy === alternative.strategy ? "selected" : ""}
              onClick={() => updateStrategy(alternative.strategy)}
            >
              <span>{strategyLabels[alternative.strategy]}</span>
              <strong>{alternative.sheetCount} chapa(s)</strong>
              <small>{alternative.operationCount} operações · desperdício {(alternative.wasteAreaMm2 / 1_000_000).toFixed(2)} m²</small>
              {alternative.selected ? <em>RECOMENDADA</em> : null}
            </button>
          ))}
          <button type="button" className="cutting-strategy-auto" disabled={preferredStrategy === null} onClick={() => updateStrategy(null)}>
            Usar seleção automática
          </button>
        </div>
      ) : null}

      {!plan ? <p className="cutting-plan-warning">A revisão não contém peças calculadas.</p> : null}
      {plan && !plan.ok ? (
        <div className="cutting-plan-warning" role="alert">
          {[...plan.errors, ...plan.pending].map(message => <p key={message}>{message}</p>)}
        </div>
      ) : null}

      {plan?.ok ? (
        <div className="cutting-sheet-list">
          {plan.sheets.map(sheet => {
            const utilization = sheet.usableAreaMm2 > 0
              ? (sheet.usedPartAreaMm2 / sheet.usableAreaMm2) * 100
              : 0;
            const dimensionResult = calculation
              ? createCuttingMapAnnotations(calculation.stock, calculation.settings, sheet)
              : null;
            const annotations = dimensionResult?.ok ? dimensionResult.annotations : null;
            const markerId = `cutting-dimension-arrow-${sheet.number}`;
            return (
              <article className="cutting-sheet-card" key={sheet.number}>
                <div>
                  <strong>Chapa {sheet.number}</strong>
                  <span>{sheet.placements.length} peças · {utilization.toFixed(1)}% da área útil em peças</span>
                </div>
                <svg
                  className="cutting-sheet-map"
                  viewBox="0 0 2750 1850"
                  role="img"
                  aria-label={`Distribuição preliminar da chapa ${sheet.number}`}
                >
                  <defs>
                    <marker id={markerId} markerWidth="18" markerHeight="18" refX="9" refY="9" orient="auto-start-reverse">
                      <path d="M 0 9 L 18 1 L 14 9 L 18 17 Z" className="cutting-dimension-arrow" />
                    </marker>
                  </defs>
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
                  {annotations?.dimensions.map(dimension => {
                    const middleX = (dimension.x1 + dimension.x2) / 2;
                    const middleY = (dimension.y1 + dimension.y2) / 2;
                    return (
                      <g key={dimension.id} className={`cutting-dimension cutting-dimension-${dimension.scope}`}>
                        <line
                          x1={dimension.x1} y1={dimension.y1} x2={dimension.x2} y2={dimension.y2}
                          markerStart={`url(#${markerId})`} markerEnd={`url(#${markerId})`}
                        />
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
      ) : null}

      {report ? (
        <div className="cutting-report-parts">
          <h3>Peças consideradas</h3>
          <table>
            <thead><tr><th>Peça</th><th>Qtd.</th><th>Dimensões</th><th>Material</th><th>Esp.</th></tr></thead>
            <tbody>{report.parts.map(part => (
              <tr key={part.id}>
                <td>{part.id}</td><td>{part.quantity}</td><td>{part.lengthMm} × {part.widthMm} mm</td>
                <td>{part.materialId}</td><td>{part.thicknessMm} mm</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      ) : null}

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

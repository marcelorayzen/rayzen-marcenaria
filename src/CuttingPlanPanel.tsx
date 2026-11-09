import { useMemo, useState } from "react";
import type { Part } from "./furnitureEngine";
import {
  createPreliminaryStripPlan,
  reportedWorkshopSheet,
  type CuttingSettings,
  type SheetTrim,
} from "./cuttingPlan";

type Grain = "length" | "width" | "none" | "pending";
type TrimSide = keyof SheetTrim;

const trimLabels: Array<[TrimSide, string]> = [
  ["topMm", "Superior"],
  ["rightMm", "Direita"],
  ["bottomMm", "Inferior"],
  ["leftMm", "Esquerda"],
];

function parseTrim(value: string): number | null {
  if (!value.trim()) return null;
  return Number(value);
}

export function CuttingPlanPanel({ parts, revision }: { parts: Part[]; revision: number }) {
  const [trim, setTrim] = useState<Record<TrimSide, string>>({
    topMm: "4",
    rightMm: "4",
    bottomMm: "4",
    leftMm: "4",
  });
  const [grain, setGrain] = useState<Grain>("none");

  const plan = useMemo(() => {
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
    return createPreliminaryStripPlan(
      {
        ...reportedWorkshopSheet,
        materialId: first.material,
        thicknessMm: first.thickness,
        grain,
      },
      settings,
      parts.map(part => ({
        id: part.id,
        materialId: part.material,
        thicknessMm: part.thickness,
        lengthMm: part.length,
        widthMm: part.width,
        quantity: part.quantity,
        grain,
        allowRotation: grain === "none",
      })),
    );
  }, [grain, parts, trim.bottomMm, trim.leftMm, trim.rightMm, trim.topMm]);

  return (
    <section className="cutting-plan-section" aria-labelledby="cutting-plan-title">
      <header className="cutting-plan-heading">
        <div>
          <span className="small-label">PRODUÇÃO · PRÉVIA</span>
          <h2 id="cutting-plan-title">Distribuição nas chapas</h2>
          <p>Chapa 2750 × 1850 mm · serra 3 mm · revisão R{String(revision).padStart(2, "0")}</p>
        </div>
        <strong>{plan?.ok ? `${plan.sheets.length} CHAPA(S)` : "CONFIGURAÇÃO PENDENTE"}</strong>
      </header>

      <div className="cutting-settings">
        <label>
          Sentido do veio
          <select value={grain} onChange={event => setGrain(event.target.value as Grain)}>
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
              onChange={event => setTrim(current => ({ ...current, [side]: event.target.value }))}
            /> mm</span>
          </label>
        ))}
      </div>

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
                  <rect className="cutting-sheet-stock" x="0" y="0" width="2750" height="1850" />
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
                        y={placement.yMm + 42}
                      >
                        {placement.partId} · {placement.lengthMm}×{placement.widthMm}
                      </text>
                    </g>
                  ))}
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

      <p className="cutting-plan-note">
        Prévia em faixas para conferência. Ainda não representa sequência de cortes nem revisão liberada para fabricação.
      </p>
    </section>
  );
}

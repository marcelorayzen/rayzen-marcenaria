import { Canvas, useThree } from "@react-three/fiber";
import { Suspense, useEffect, useMemo, useState } from "react";
import {
  createCounterModel,
  createPartsCsv,
  validateCounter,
  type CounterParameters,
  type Part,
} from "./furnitureEngine";
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
  number: number;
  savedAt: string;
  parameters: CounterParameters;
}

export default function App() {
  const [parameters, setParameters] =
    useState<CounterParameters>(initialParameters);
  const [revisions, setRevisions] = useState<Revision[]>([
    {
      number: 1,
      savedAt: formatRevisionTimestamp(new Date()),
      parameters: initialParameters,
    },
  ]);
  const [view, setView] = useState<ViewMode>("isometric");
  const [selectedPart, setSelectedPart] = useState<string | null>(null);

  const issues = validateCounter(parameters);
  const model = useMemo(
    () => (issues.length === 0 ? createCounterModel(parameters) : null),
    [issues.length, parameters],
  );
  const savedRevision = revisions[revisions.length - 1]!;
  const isDirty =
    JSON.stringify(parameters) !== JSON.stringify(savedRevision.parameters);

  function updateParameter(field: keyof CounterParameters, rawValue: string) {
    const value = Number(rawValue);
    setParameters((current) => ({ ...current, [field]: value }));
  }

  function saveRevision() {
    if (issues.length > 0 || !isDirty) return;
    const nextNumber = savedRevision.number + 1;
    setRevisions((current) => [
      ...current,
      {
        number: nextNumber,
        savedAt: formatRevisionTimestamp(new Date()),
        parameters: { ...parameters },
      },
    ]);
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
          <span className="project-id">DADOS DE DEMONSTRAÇÃO</span>
          <span className="topbar-divider" aria-hidden="true" />
          <span>Balcão de ensaio</span>
        </div>
        <div className="topbar-status">
          <span className="status-dot" />
          <span>Local · sem sincronização</span>
        </div>
      </header>

      <div className="page">
        <section className="project-heading" aria-labelledby="project-title">
          <div className="heading-main">
            <h1 id="project-title">Balcão de ensaio</h1>
            <p>Demonstração local · modelo geométrico em MDF, sem portas ou fundo</p>
          </div>
          <RevisionTicket
            revision={savedRevision}
            isDirty={isDirty}
            invalid={issues.length > 0}
          />
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

export interface CounterParameters {
  width: number;
  height: number;
  depth: number;
  thickness: number;
}

export interface Part {
  id: string;
  code: string;
  name: string;
  quantity: number;
  length: number;
  width: number;
  thickness: number;
  material: string;
  edges: string;
}

export interface ValidationIssue {
  field: keyof CounterParameters;
  message: string;
}

export interface CounterModel {
  parameters: CounterParameters;
  parts: Part[];
}

export function validateCounter(
  parameters: CounterParameters,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  for (const [field, value] of Object.entries(parameters) as [
    keyof CounterParameters,
    number,
  ][]) {
    if (!Number.isFinite(value) || value <= 0) {
      issues.push({
        field,
        message: "Informe uma medida maior que zero.",
      });
    }
  }

  if (issues.length > 0) return issues;

  if (parameters.width <= parameters.thickness * 2) {
    issues.push({
      field: "width",
      message: "A largura precisa comportar as duas laterais.",
    });
  }

  if (parameters.height <= parameters.thickness) {
    issues.push({
      field: "height",
      message: "A altura precisa comportar a espessura das peças.",
    });
  }

  if (parameters.depth <= 0) {
    issues.push({
      field: "depth",
      message: "A profundidade precisa ser maior que zero.",
    });
  }

  return issues;
}

export function createCounterModel(
  parameters: CounterParameters,
): CounterModel {
  const issues = validateCounter(parameters);
  if (issues.length > 0) {
    throw new Error(issues.map((issue) => issue.message).join(" "));
  }

  const innerWidth = parameters.width - parameters.thickness * 2;
  const material = `MDF ${parameters.thickness} mm`;

  return {
    parameters: { ...parameters },
    parts: [
      {
        id: "counter-side",
        code: "BC-01",
        name: "Lateral",
        quantity: 2,
        length: parameters.height,
        width: parameters.depth,
        thickness: parameters.thickness,
        material,
        edges: "Sem fita",
      },
      {
        id: "counter-top",
        code: "BC-02",
        name: "Tampo",
        quantity: 1,
        length: innerWidth,
        width: parameters.depth,
        thickness: parameters.thickness,
        material,
        edges: "Sem fita",
      },
      {
        id: "counter-base",
        code: "BC-03",
        name: "Base",
        quantity: 1,
        length: innerWidth,
        width: parameters.depth,
        thickness: parameters.thickness,
        material,
        edges: "Sem fita",
      },
    ],
  };
}

export function createPartsCsv(
  model: CounterModel,
  revision: number,
): string {
  const rows = [
    ["Projeto", "Balcão de ensaio"],
    ["Revisão", `R${String(revision).padStart(2, "0")}`],
    ["Unidade", "mm"],
    [],
    [
      "Código",
      "Peça",
      "Quantidade",
      "Comprimento (mm)",
      "Largura (mm)",
      "Espessura (mm)",
      "Material",
      "Bordas",
    ],
    ...model.parts.map((part) => [
      part.code,
      part.name,
      String(part.quantity),
      String(part.length),
      String(part.width),
      String(part.thickness),
      part.material,
      part.edges,
    ]),
  ];

  return `\uFEFF${rows.map((row) => row.map(csvCell).join(";")).join("\r\n")}`;
}

function csvCell(value: string | undefined): string {
  if (value === undefined) return "";
  return `"${value.replaceAll('"', '""')}"`;
}

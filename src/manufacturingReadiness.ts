import type { ProjectSnapshot } from "./projectDomain";
import { getProjectChecks } from "./projectChecks";

export interface ManufacturingReadinessItem {
  id: string;
  label: string;
  status: "ok" | "pending" | "blocked";
  detail: string;
}

export interface ManufacturingReadiness {
  ready: false;
  items: ManufacturingReadinessItem[];
  note: string;
}

/** A preparation checklist only; it never grants technical production release. */
export function getManufacturingReadiness(snapshot: ProjectSnapshot): ManufacturingReadiness {
  const checks = getProjectChecks(snapshot);
  const openPending = snapshot.pendingItems.filter(item => item.resolvedByRecordId === undefined).length;
  const hasWall = (snapshot.walls ?? []).length > 0;
  const hasMeasurements = snapshot.measurements.length > 0;
  const hasUnpositioned = snapshot.furniture.some(item => !item.placement);
  const hasInterferenceAlert = checks.some(item => item.id.startsWith("constraint-inside:") || item.id.startsWith("point-outside:") || item.id.startsWith("counter-outside:"));
  const items: ManufacturingReadinessItem[] = [
    { id: "measurements", label: "Medidas registradas", status: hasMeasurements ? "ok" : "pending", detail: hasMeasurements ? `${snapshot.measurements.length} medida(s) registrada(s).` : "Registre ao menos uma medida da visita." },
    { id: "wall", label: "Ambiente em parede", status: hasWall ? "ok" : "pending", detail: hasWall ? `${snapshot.walls?.length ?? 0} parede(s) registrada(s).` : "Registre a parede antes da conferência." },
    { id: "placements", label: "Móveis posicionados", status: hasUnpositioned ? "pending" : "ok", detail: hasUnpositioned ? "Há móvel sem posição conferida." : "As posições registradas estão preenchidas." },
    { id: "pending", label: "Pendências resolvidas", status: openPending > 0 ? "pending" : "ok", detail: openPending > 0 ? `${openPending} pendência(s) ainda aberta(s).` : "Não há pendências abertas." },
    { id: "interferences", label: "Interferências conferidas", status: hasInterferenceAlert ? "blocked" : "ok", detail: hasInterferenceAlert ? "Há interferência ou ponto fora dos limites registrados." : "Nenhum alerta geométrico registrado." },
    { id: "technical-release", label: "Liberação técnica", status: "blocked", detail: "Ainda não disponível neste demonstrador; exige ação explícita do marceneiro." },
  ];
  return { ready: false, items, note: "Checklist de preparação. Não é uma liberação de fabricação." };
}

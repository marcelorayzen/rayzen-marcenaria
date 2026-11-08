import type { ProjectSnapshot } from "./projectDomain";
import {
  findConstraintsInsideFurniture,
  projectConstraintsOnWall,
  projectFurnitureOnWall,
} from "./wallElevation";

export interface ProjectCheck {
  id: string;
  message: string;
}

/**
 * Reports only explicit gaps in the local draft. It is intentionally not a
 * manufacturing release decision and does not create construction rules.
 */
export function getProjectChecks(snapshot: ProjectSnapshot): ProjectCheck[] {
  const checks: ProjectCheck[] = [];
  const openPending = snapshot.pendingItems.filter((item) => item.resolvedByRecordId === undefined);
  if (openPending.length > 0) {
    checks.push({ id: "open-pending", message: `${openPending.length} pendência(s) ainda aberta(s).` });
  }

  for (const furniture of snapshot.furniture) {
    if (furniture.kind !== "counter") continue;
    if (!furniture.placement) {
      checks.push({ id: `missing-placement:${furniture.id}`, message: `${furniture.label} ainda não está posicionado em uma parede.` });
      continue;
    }
    const wall = (snapshot.walls ?? []).find((item) => item.id === furniture.placement?.wallId);
    if (!wall) continue;
    if (!projectFurnitureOnWall(wall, furniture.placement, furniture.parameters).inBounds) {
      checks.push({ id: `counter-outside:${furniture.id}`, message: `${furniture.label} ultrapassa os limites registrados da parede.` });
    }
    const wallConstraints = snapshot.physicalConstraints.filter((item) => item.wallId === wall.id);
    const overlaps = findConstraintsInsideFurniture(furniture.placement, furniture.parameters, wallConstraints);
    if (overlaps.length > 0) {
      checks.push({ id: `constraint-inside:${furniture.id}`, message: `${overlaps.length} interferência(s) registrada(s) dentro do retângulo de ${furniture.label}.` });
    }
  }

  for (const wall of snapshot.walls ?? []) {
    const outside = projectConstraintsOnWall(
      wall,
      snapshot.physicalConstraints.filter((item) => item.wallId === wall.id),
    ).filter((marker) => !marker.inBounds);
    if (outside.length > 0) {
      checks.push({ id: `point-outside:${wall.id}`, message: `${outside.length} ponto(s) fora dos limites registrados de ${wall.label}.` });
    }
  }
  return checks;
}

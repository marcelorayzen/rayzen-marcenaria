import type { PhysicalConstraint, Wall, WallPlacement } from "./projectDomain";

export interface ElevationMarker {
  id: string;
  label: string;
  kind: PhysicalConstraint["kind"];
  xPercent: number;
  yPercent: number;
  inBounds: boolean;
}

export interface ElevationFurniture {
  leftPercent: number;
  bottomPercent: number;
  widthPercent: number;
  heightPercent: number;
  inBounds: boolean;
}

/**
 * Translates recorded coordinates into a display-only wall elevation. It does
 * not infer recesses, clearances, or dimensions that were not recorded.
 */
export function projectConstraintsOnWall(
  wall: Wall,
  constraints: PhysicalConstraint[],
): ElevationMarker[] {
  return constraints.map((constraint) => ({
    id: constraint.id,
    label: constraint.label,
    kind: constraint.kind,
    xPercent: (constraint.position.x / wall.width) * 100,
    yPercent: 100 - (constraint.position.y / wall.height) * 100,
    inBounds:
      constraint.position.x >= 0 &&
      constraint.position.x <= wall.width &&
      constraint.position.y >= 0 &&
      constraint.position.y <= wall.height,
  }));
}

export function projectFurnitureOnWall(
  wall: Wall,
  placement: WallPlacement,
  dimensions: { width: number; height: number },
): ElevationFurniture {
  const inBounds =
    placement.x >= 0 &&
    placement.y >= 0 &&
    placement.x + dimensions.width <= wall.width &&
    placement.y + dimensions.height <= wall.height;
  return {
    leftPercent: (placement.x / wall.width) * 100,
    bottomPercent: (placement.y / wall.height) * 100,
    widthPercent: (dimensions.width / wall.width) * 100,
    heightPercent: (dimensions.height / wall.height) * 100,
    inBounds,
  };
}

/**
 * Flags only recorded point coordinates that fall inside the furniture
 * rectangle. It deliberately does not interpret a constraint's dimensions as
 * a clearance or prescribe a recess.
 */
export function findConstraintsInsideFurniture(
  placement: WallPlacement,
  dimensions: { width: number; height: number },
  constraints: PhysicalConstraint[],
): PhysicalConstraint[] {
  return constraints.filter((constraint) =>
    constraint.position.x >= placement.x &&
    constraint.position.x <= placement.x + dimensions.width &&
    constraint.position.y >= placement.y &&
    constraint.position.y <= placement.y + dimensions.height,
  );
}

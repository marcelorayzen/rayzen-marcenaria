import type { InternalRole } from "./internalTeam";

export interface RoleCapabilities {
  canEditProject: boolean;
  canValidateCommercial: boolean;
  canReleaseProduction: boolean;
}

export function getRoleCapabilities(roles: readonly InternalRole[]): RoleCapabilities {
  return {
    canEditProject: roles.includes("representante") || roles.includes("marceneiro"),
    canValidateCommercial: roles.includes("representante"),
    canReleaseProduction: roles.includes("marceneiro"),
  };
}

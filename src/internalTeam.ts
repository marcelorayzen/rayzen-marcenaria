export type InternalRole = "representante" | "marceneiro";

export interface InternalTeamMember {
  displayName: string;
  roles: readonly InternalRole[];
}

/** Names and responsibilities confirmed for the first internal team. */
export const confirmedInternalTeam: readonly InternalTeamMember[] = [
  { displayName: "Kevin", roles: ["marceneiro"] },
  { displayName: "Moises", roles: ["marceneiro", "representante"] },
  { displayName: "Marcelo", roles: ["marceneiro"] },
  { displayName: "Tais", roles: ["representante"] },
];

export function validateInternalTeam(team: readonly InternalTeamMember[]): string[] {
  const issues: string[] = [];
  const names = new Set<string>();
  const roles = new Set<InternalRole>();

  for (const member of team) {
    const normalizedName = member.displayName.trim().toLocaleLowerCase();
    if (!normalizedName) issues.push("Cada membro precisa de um nome.");
    if (names.has(normalizedName)) issues.push(`Membro duplicado: ${member.displayName}.`);
    names.add(normalizedName);
    if (member.roles.length === 0) issues.push(`${member.displayName} precisa de ao menos um papel.`);
    for (const role of member.roles) roles.add(role);
  }

  if (!roles.has("marceneiro")) issues.push("É necessário ao menos um marceneiro.");
  if (!roles.has("representante")) issues.push("É necessário ao menos um responsável por projeto.");
  return issues;
}

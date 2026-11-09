import type { DraftSyncState } from "./projectDomain";

export interface DraftSynchronizationPresentation {
  label: string;
  detail: string;
  allowsProjectGates: boolean;
}

const presentations: Record<DraftSyncState, DraftSynchronizationPresentation> = {
  "local-only": {
    label: "Somente local",
    detail: "Este rascunho existe apenas neste dispositivo e ainda não foi sincronizado.",
    allowsProjectGates: false,
  },
  "sync-pending": {
    label: "Aguardando sincronização",
    detail: "Há dados locais aguardando envio; confirme a sincronização antes de avançar nos gates do projeto.",
    allowsProjectGates: false,
  },
  synced: {
    label: "Sincronizado",
    detail: "A revisão está sincronizada. As demais regras de acesso e aprovação continuam obrigatórias.",
    allowsProjectGates: true,
  },
  conflict: {
    label: "Conflito de sincronização",
    detail: "Há versões incompatíveis. Escolha uma resolução explícita antes de prosseguir.",
    allowsProjectGates: false,
  },
  "sync-failed": {
    label: "Falha na sincronização",
    detail: "O envio não foi concluído. Preserve o rascunho local e tente novamente após corrigir a causa.",
    allowsProjectGates: false,
  },
};

export function getDraftSynchronizationPresentation(
  state: DraftSyncState,
): DraftSynchronizationPresentation {
  return presentations[state];
}

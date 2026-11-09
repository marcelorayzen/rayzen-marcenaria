import { describe, expect, it } from "vitest";
import { getDraftSynchronizationPresentation } from "./draftSynchronization";

describe("draft synchronization presentation", () => {
  it("identifies a device-only draft without implying it is ready for approvals", () => {
    expect(getDraftSynchronizationPresentation("local-only")).toEqual({
      label: "Somente local",
      detail: "Este rascunho existe apenas neste dispositivo e ainda não foi sincronizado.",
      allowsProjectGates: false,
    });
  });

  it("keeps pending, failed and conflicting states outside project gates", () => {
    expect(getDraftSynchronizationPresentation("sync-pending").allowsProjectGates).toBe(false);
    expect(getDraftSynchronizationPresentation("sync-failed").allowsProjectGates).toBe(false);
    expect(getDraftSynchronizationPresentation("conflict").allowsProjectGates).toBe(false);
  });

  it("marks only a synchronized draft as eligible for later approval checks", () => {
    expect(getDraftSynchronizationPresentation("synced").allowsProjectGates).toBe(true);
  });
});

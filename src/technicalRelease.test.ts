import { describe, expect, it } from "vitest";
import type { ManufacturingReadiness } from "./manufacturingReadiness";
import { buildReleaseChecklist } from "./technicalRelease";

function readiness(statuses: Array<"ok" | "pending" | "blocked">): ManufacturingReadiness {
  return {
    ready: false,
    note: "Checklist de preparação.",
    items: [
      ...statuses.map((status, index) => ({ id: `item-${index}`, label: `Item ${index}`, status, detail: "" })),
      { id: "technical-release", label: "Liberação técnica", status: "blocked" as const, detail: "" },
    ],
  };
}

describe("technical release checklist", () => {
  it("releases a complete checklist without justification", () => {
    const result = buildReleaseChecklist(readiness(["ok", "ok"]), 3, "");
    expect(result).toMatchObject({ ok: true, snapshot: { revisionNumber: 3, openItemIds: [], justification: null } });
    if (result.ok) expect(result.snapshot.items.map(item => item.id)).toEqual(["item-0", "item-1"]);
  });

  it("requires a written justification for pending or blocked items", () => {
    const result = buildReleaseChecklist(readiness(["ok", "pending", "blocked"]), 2, "   ");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toContain("Item 1, Item 2");
  });

  it("records the justification and which items were open", () => {
    const result = buildReleaseChecklist(readiness(["pending", "ok"]), 2, " Medida conferida na obra pelo marceneiro. ");
    expect(result).toMatchObject({
      ok: true,
      snapshot: { openItemIds: ["item-0"], justification: "Medida conferida na obra pelo marceneiro." },
    });
  });

  it("refuses an invalid revision number", () => {
    expect(buildReleaseChecklist(readiness(["ok"]), 0, "").ok).toBe(false);
  });
});

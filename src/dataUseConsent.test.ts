import { describe, expect, it } from "vitest";
import {
  canUseProjectData,
  type DataUseConsent,
  validateDataUseConsent,
} from "./dataUseConsent";

const consent: DataUseConsent = {
  id: "consent-1",
  projectId: "project-1",
  subjectId: "customer-1",
  policyVersion: "2026-11-08",
  purposes: ["project-operation", "authorized-migration", "product-improvement"],
  status: "active",
  acceptedAt: "2026-11-08T16:30:00.000Z",
};

describe("data use consent", () => {
  it("records explicit acceptance for project operation and governed improvement", () => {
    expect(validateDataUseConsent(consent)).toEqual([]);
    expect(canUseProjectData(consent, "product-improvement")).toBe(true);
  });

  it("rejects a consent without the project-operation purpose", () => {
    expect(
      validateDataUseConsent({ ...consent, purposes: ["product-improvement"] }),
    ).toContainEqual({
      path: "purposes",
      message: "A operação do projeto precisa constar nas finalidades aceitas.",
    });
  });

  it("does not authorize a purpose after consent withdrawal", () => {
    const withdrawn: DataUseConsent = {
      ...consent,
      status: "withdrawn",
      withdrawnAt: "2026-12-01T12:00:00.000Z",
    };

    expect(validateDataUseConsent(withdrawn)).toEqual([]);
    expect(canUseProjectData(withdrawn, "product-improvement")).toBe(false);
  });
});

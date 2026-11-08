import { describe, expect, it } from "vitest";
import { validatePublicSupabaseConfiguration } from "./supabaseConfiguration";

const validInput = {
  url: "https://example.supabase.co",
  publishableKey: "sb_publishable_example",
};

const legacyServiceRoleJwt = "header.eyJyb2xlIjoic2VydmljZV9yb2xlIn0.signature";

describe("public Supabase configuration", () => {
  it("accepts a public URL and publishable key without contacting the service", () => {
    expect(validatePublicSupabaseConfiguration(validInput)).toEqual({
      configured: true,
      configuration: validInput,
    });
  });

  it.each([
    [{ publishableKey: validInput.publishableKey }, "missing-url"],
    [{ url: validInput.url }, "missing-publishable-key"],
    [{ ...validInput, url: "ftp://example.supabase.co" }, "invalid-url"],
    [{ ...validInput, url: "https://user:pass@example.supabase.co" }, "invalid-url"],
    [{ ...validInput, publishableKey: "sb_secret_do-not-use" }, "unsafe-key"],
    [{ ...validInput, publishableKey: "contains-service_role" }, "unsafe-key"],
    [{ ...validInput, publishableKey: legacyServiceRoleJwt }, "unsafe-key"],
  ] as const)("keeps the browser client disabled for %s", (input, issue) => {
    expect(validatePublicSupabaseConfiguration(input)).toEqual({
      configured: false,
      issue,
    });
  });
});

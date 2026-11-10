import { describe, expect, it } from "vitest";
import { canonicalJson, sameCanonicalJson } from "./canonicalJson";

describe("canonical JSON comparison", () => {
  it("treats jsonb key reordering as the same content", () => {
    const local = { revision: { number: 1, id: "r1" }, project: { title: "A", id: "p1" } };
    const remote = { project: { id: "p1", title: "A" }, revision: { id: "r1", number: 1 } };
    expect(JSON.stringify(local)).not.toBe(JSON.stringify(remote));
    expect(sameCanonicalJson(local, remote)).toBe(true);
  });

  it("keeps array order and detects changed values", () => {
    expect(sameCanonicalJson({ items: [1, 2] }, { items: [2, 1] })).toBe(false);
    expect(sameCanonicalJson({ width: 900 }, { width: 901 })).toBe(false);
  });

  it("drops undefined object fields like JSON serialization does", () => {
    expect(canonicalJson({ a: 1, placement: undefined })).toBe('{"a":1}');
  });
});

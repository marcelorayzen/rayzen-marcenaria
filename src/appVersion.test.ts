import { describe, expect, it } from "vitest";
import manifest from "../package.json";
import { APP_VERSION, formatAppVersion, resolveAppVersion } from "./appVersion";

function packageJsonVersion(): string {
  return manifest.version;
}

describe("versão da aplicação", () => {
  it("expõe à UI exatamente a versão declarada em package.json", () => {
    expect(APP_VERSION).toBe(packageJsonVersion());
  });

  it("exibe a versão com prefixo v", () => {
    expect(formatAppVersion(APP_VERSION)).toBe(`v${packageJsonVersion()}`);
  });

  it("falha de forma explícita quando a versão não foi injetada", () => {
    expect(() => resolveAppVersion(undefined)).toThrow(/package\.json/);
    expect(() => resolveAppVersion("")).toThrow();
    expect(() => resolveAppVersion("   ")).toThrow();
    expect(() => formatAppVersion("")).toThrow();
  });
});

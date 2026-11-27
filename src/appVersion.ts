// Injetado em tempo de build por `define` em vite.config.ts, a partir de package.json.
declare const __APP_VERSION__: string | undefined;

export function resolveAppVersion(raw: unknown): string {
  if (typeof raw !== "string" || raw.trim() === "") {
    throw new Error(
      "Versão da aplicação indisponível: __APP_VERSION__ não foi injetado a partir de package.json.",
    );
  }
  return raw;
}

export function formatAppVersion(version: string): string {
  return `v${resolveAppVersion(version)}`;
}

export const APP_VERSION = resolveAppVersion(
  typeof __APP_VERSION__ === "undefined" ? undefined : __APP_VERSION__,
);

import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import manifest from "./package.json";

// Fonte única da versão: `version` de package.json, lida a cada start/build.
// Falha explícita se ausente; não há valor de reserva.
function readPackageVersion(): string {
  const version: unknown = manifest.version;
  if (typeof version !== "string" || version.trim() === "") {
    throw new Error("package.json não declara uma `version` válida.");
  }
  return version;
}

export default defineConfig({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(readPackageVersion()),
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          "three-vendor": ["three"],
          "fiber-vendor": ["@react-three/fiber"],
          "supabase-vendor": ["@supabase/supabase-js"],
        },
      },
    },
  },
  test: {
    environment: "node",
  },
});

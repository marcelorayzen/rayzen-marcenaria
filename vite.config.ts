import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
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

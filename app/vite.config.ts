import path from "node:path";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import pkhexEngine from "@pkhex-everywhere/engine/vite";

export default defineConfig({
  plugins: [react(), tailwindcss(), pkhexEngine()],
  resolve: { alias: { "@": path.resolve(import.meta.dirname, "src") } },
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    host: process.env.TAURI_DEV_HOST || false,
    watch: { ignored: ["**/src-tauri/**"] },
  },
  test: { environment: "jsdom", setupFiles: ["src/testSetup.ts"] },
});

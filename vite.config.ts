import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "~": resolve(import.meta.dirname, "src/frontend"),
      "@shared": resolve(import.meta.dirname, "src/shared"),
      "@backend": resolve(import.meta.dirname, "src/backend"),
    },
  },
  server: {
    port: 5023,
    proxy: {
      "/api": "http://localhost:8023",
      "/auth": "http://localhost:8023",
    },
  },
  build: {
    outDir: "build/client",
    emptyOutDir: true,
    chunkSizeWarningLimit: 5120,
  },
});

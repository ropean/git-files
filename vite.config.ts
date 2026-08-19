import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "~": resolve(__dirname, "src/frontend"),
      "@shared": resolve(__dirname, "src/shared"),
      "@backend": resolve(__dirname, "src/backend"),
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

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ command, isPreview }) => ({
  // Keep local development at / and publish the built game under its repo path.
  base: command === "serve" && !isPreview ? "/" : "/kibogame/",
  plugins: [react()],
  build: { rollupOptions: { output: { manualChunks: { three: ["three"] } } } },
}));

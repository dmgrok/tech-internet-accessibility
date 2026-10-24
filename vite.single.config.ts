import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

// Relative base so the offline hour-of-pay file still opens on its own.
export default defineConfig({
  plugins: [react(), viteSingleFile()],
  base: "./",
  build: {
    outDir: "dist-single",
    sourcemap: false,
    cssCodeSplit: false,
    assetsInlineLimit: 100000000,
    emptyOutDir: true,
    rollupOptions: {
      input: "hour-of-pay/index.html",
    },
  },
});

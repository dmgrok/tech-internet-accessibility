import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  base: "/tech-internet-accessibility/",
  server: { host: "0.0.0.0", port: 4737, strictPort: true },
  build: {
    sourcemap: false,
    rollupOptions: {
      input: {
        main: "index.html",
        hour: "hour-of-pay/index.html",
        access: "internet-access/index.html",
      },
    },
  },
});

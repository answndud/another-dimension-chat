import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "dist",
    emptyOutDir: false,
    manifest: true,
    rollupOptions: {
      input: "/src/main.tsx",
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/local-api": {
        target: "http://127.0.0.1:1420",
        changeOrigin: true,
      },
      "/local-session": {
        target: "http://127.0.0.1:1420",
        changeOrigin: true,
      },
    },
  },
});

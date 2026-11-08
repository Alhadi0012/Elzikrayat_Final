import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

/**
 * Development proxy.
 *
 * The browser calls /api/... on the Vite server, which forwards it to Express
 * on port 5000. This removes every cross-origin problem in development and
 * keeps absolute URLs out of the source.
 */
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:5000",
        changeOrigin: true
      }
    }
  }
});

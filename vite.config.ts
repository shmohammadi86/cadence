import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Fixed port 5173: Tauri devUrl in src-tauri/tauri.conf.json points here (YAR pattern).
export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  server: { port: 5173, strictPort: true },
  build: { target: "es2021" },
});

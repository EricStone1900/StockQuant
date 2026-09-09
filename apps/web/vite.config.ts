import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const platformApi = process.env.STOCKQUANT_PLATFORM_API_URL ?? "http://127.0.0.1:3000";

export default defineConfig({
  plugins: [react()],
  server: { proxy: { "/api": { target: platformApi, changeOrigin: true } } },
  preview: { proxy: { "/api": { target: platformApi, changeOrigin: true } } }
});

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";

export default defineConfig({
  base: "/qrcode/",
  plugins: [react()],
  server: {
    port: 5173,
  },
  resolve: {
    alias: {
      "@": "/src",
    },
  },
});

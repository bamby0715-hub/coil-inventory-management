import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "/coil-inventory-management/",
  plugins: [react()],
});

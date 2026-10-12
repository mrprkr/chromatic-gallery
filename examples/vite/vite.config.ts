import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Relative base so the build works from any path, such as GitHub Pages' /chromatic-gallery/.
export default defineConfig({ base: "./", plugins: [react()] });

import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
    },
    projects: [
      {
        extends: true,
        test: {
          name: "frontend",
          environment: "jsdom",
          globals: true,
          include: ["src/**/*.{test,spec}.{ts,tsx}"],
          setupFiles: ["./src/test/setup.ts"],
        },
      },
      {
        extends: true,
        test: {
          name: "convex",
          environment: "edge-runtime",
          globals: true,
          include: ["convex/**/*.test.ts"],
        },
      },
    ],
  },
});

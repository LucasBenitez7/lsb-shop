import path from "path";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    include: ["**/__tests__/**/*.{ts,tsx}", "**/*.{test,spec}.{ts,tsx}"],
    // Playwright lives under `e2e/*.spec.ts` — must not match Vitest's `*.spec.ts` glob.
    exclude: [
      "node_modules",
      ".next",
      "**/e2e/**",
      "playwright-report",
      "test-results",
    ],

    /**
     * Use `forks` (child processes), not `threads`: Node worker_threads ignore
     * `--max-old-space-size` in execArgv (ERR_WORKER_INVALID_EXEC_ARGV) and hit a
     * low default heap → OOM. Forks inherit `NODE_OPTIONS` from `pnpm test:run`.
     */
    pool: "forks",
    maxWorkers: 1,
    fileParallelism: false,

    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: [
        "node_modules",
        ".next",
        "**/e2e/**",
        "**/*.config.*",
        "**/*.d.ts",
        "app/layout.tsx",
        "app/providers.tsx",
      ],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});

import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
    exclude: [...configDefaults.exclude, "tests/integration/**", "tests/e2e/**", "stryker-tmp/**"],
    coverage: {
      provider: "istanbul",
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/**/*.d.ts",
        "src/components/ui/**",
        // Sentry SDK bootstrap wiring; exercised by Next.js at runtime, not unit tests.
        "src/instrumentation.ts",
        "src/instrumentation-client.ts",
        "src/app/global-error.tsx",
      ],
      reportsDirectory: path.join(os.tmpdir(), `hacker-news-japan-coverage-${path.basename(process.cwd())}`),
      thresholds: {
        statements: 100,
        branches: 100,
        functions: 100,
        lines: 100,
      },
    },
  },
});

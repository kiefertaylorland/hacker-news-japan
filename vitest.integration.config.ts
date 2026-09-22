import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/**
 * Separate from vitest.config.ts on purpose: these tests hit a real local
 * Supabase instance (see tests/integration/setup.ts) instead of mocks, so
 * they're excluded from the unit suite's 100% coverage gate and run via
 * their own `npm run test:integration` script.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["tests/integration/**/*.integration.test.ts"],
    setupFiles: ["./tests/integration/setup.ts"],
  },
});

/** @type {import('@stryker-mutator/api/core').PartialStrykerOptions} */
export default {
  packageManager: "npm",
  testRunner: "vitest",
  vitest: {
    configFile: "vitest.config.ts",
  },
  coverageAnalysis: "perTest",
  mutate: [
    "src/**/*.ts",
    "src/**/*.tsx",
    "!src/**/*.d.ts",
    "!src/components/ui/**",
    // Sentry SDK bootstrap wiring; excluded from coverage in vitest.config.ts too.
    "!src/instrumentation.ts",
    "!src/instrumentation-client.ts",
    "!src/app/global-error.tsx",
  ],
  reporters: ["progress", "clear-text", "html"],
  htmlReporter: {
    fileName: "reports/mutation/index.html",
  },
  thresholds: {
    high: 100,
    low: 85,
    break: 95,
  },
  tempDirName: "stryker-tmp",
  cleanTempDir: true,
};

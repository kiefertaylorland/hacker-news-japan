import { defineConfig, devices } from "@playwright/test";
import { STORAGE_STATE } from "./tests/e2e/storageState";

const FAKE_GITHUB_PORT = 4010;

/**
 * Browser E2E against a real local Supabase stack. Run via `npm run test:e2e`
 * (scripts/e2e.sh), which starts Supabase with its GitHub provider pointed at
 * tests/e2e/fake-github and exports the env this config and the app read.
 */
export default defineConfig({
  testDir: "tests/e2e",
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  globalSetup: "./tests/e2e/global-setup.ts",
  globalTeardown: "./tests/e2e/global-teardown.ts",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    ...devices["Desktop Chrome"],
    // GoTrue (in Docker) and the browser (on the host) must use the same fake-GitHub
    // URL; on macOS that's host.docker.internal, which only resolves inside containers.
    launchOptions: { args: ["--host-resolver-rules=MAP host.docker.internal 127.0.0.1"] },
  },
  projects: [
    { name: "setup", testMatch: /auth\.setup\.ts/ },
    {
      name: "bookmarks",
      testMatch: /bookmarks\.spec\.ts/,
      dependencies: ["setup"],
      use: { storageState: STORAGE_STATE },
    },
    // Starts signed out and drives the full OAuth flow itself. Runs after `bookmarks`:
    // its sign-out revokes every session of the shared fake user, including the saved one.
    { name: "auth", testMatch: /auth\.spec\.ts/, dependencies: ["bookmarks"] },
  ],
  // Always started fresh: reusing a server left on :3000 would silently test a stale build.
  webServer: [
    {
      command: "node tests/e2e/fake-github/server.mts",
      url: `http://localhost:${FAKE_GITHUB_PORT}/health`,
      env: { FAKE_GITHUB_PORT: String(FAKE_GITHUB_PORT) },
    },
    {
      command: "npm run build && npm run start",
      url: "http://localhost:3000",
      timeout: 240_000,
    },
  ],
});

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const sentry = vi.hoisted(() => ({
  init: vi.fn(),
  addIntegration: vi.fn(),
  replayIntegration: vi.fn(() => ({ name: "Replay" })),
  captureException: vi.fn(),
  captureRouterTransitionStart: vi.fn(),
}));

vi.mock("@sentry/nextjs", () => sentry);

describe("client monitoring startup", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.stubEnv("NEXT_PUBLIC_VERCEL_ENV", "production");
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("starts error monitoring immediately and waits for page load to start replay", async () => {
    vi.spyOn(document, "readyState", "get").mockReturnValue("loading");
    const listener = vi.spyOn(window, "addEventListener").mockImplementation(() => {});
    const { onRouterTransitionStart } = await import("@/instrumentation-client");

    expect(sentry.init).toHaveBeenCalledWith(expect.objectContaining({ enabled: true }));
    expect(onRouterTransitionStart).toBe(sentry.captureRouterTransitionStart);
    expect(sentry.replayIntegration).not.toHaveBeenCalled();
    expect(listener).toHaveBeenCalledWith("load", expect.any(Function), { once: true });

    const callback = listener.mock.calls.find(([event]) => event === "load")![1] as () => void;
    callback();
    await vi.waitFor(() => expect(sentry.addIntegration).toHaveBeenCalledWith({ name: "Replay" }));
  });

  it("loads replay when initialization happens after the page has loaded", async () => {
    vi.spyOn(document, "readyState", "get").mockReturnValue("complete");
    await import("@/instrumentation-client");
    await vi.waitFor(() => expect(sentry.addIntegration).toHaveBeenCalledOnce());
  });

  it("reports a replay startup failure without rejecting startup", async () => {
    vi.spyOn(document, "readyState", "get").mockReturnValue("complete");
    const error = new Error("Recorder unavailable");
    sentry.replayIntegration.mockImplementationOnce(() => { throw error; });
    await import("@/instrumentation-client");
    await vi.waitFor(() => expect(sentry.captureException).toHaveBeenCalledWith(error));
  });

  it("does not load replay outside Vercel deployments", async () => {
    vi.stubEnv("NEXT_PUBLIC_VERCEL_ENV", "");
    await import("@/instrumentation-client");
    expect(sentry.init).toHaveBeenCalledWith(expect.objectContaining({ enabled: false }));
    expect(sentry.replayIntegration).not.toHaveBeenCalled();
  });
});

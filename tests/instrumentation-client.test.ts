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

  it.each([
    ["Non-Error promise rejection captured with value: Object Not Found Matching Id:2, MethodName:update, ParamCount:4", true],
    ["Object Not Found Matching Id:123, MethodName:update, ParamCount:4", true],
    ["Non-Error promise rejection captured with value: Failed to fetch", false],
    ["Cannot read properties of undefined (reading 'update')", false],
    ["Object Not Found Matching Id:2", false],
    ["Object Not Found Matching Id:2, MethodName:save, ParamCount:4", false],
    ["Object Not Found Matching Id:2, MethodName:update, ParamCount:3", false],
    ["Object Not Found Matching Id:2, MethodName:update, ParamCount:40", false],
    ["Application failure: Object Not Found Matching Id:2, MethodName:update, ParamCount:4", false],
    ["Object Not Found Matching Id:2, MethodName:update, ParamCount:4 while saving story", false],
  ])("filters only the known CefSharp update rejection: %s", async (value, ignored) => {
    vi.stubEnv("NEXT_PUBLIC_VERCEL_ENV", "");
    await import("@/instrumentation-client");
    // Exercise the SDK's real filter with the options registered by our bootstrap.
    const { eventFiltersIntegration } = await vi.importActual<typeof import("@sentry/nextjs")>("@sentry/nextjs");
    const filter = eventFiltersIntegration();
    // The filter only reads client options; no SDK initialization or network transport.
    const client = {
      getOptions: () => sentry.init.mock.calls[0][0],
    } as Parameters<NonNullable<typeof filter.processEvent>>[2];
    const event = { exception: { values: [{ type: "UnhandledRejection", value }] } };
    const result = filter.processEvent!(event, {}, client);
    expect(result).toEqual(ignored ? null : event);
  });
});

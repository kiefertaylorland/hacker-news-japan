import { vi } from "vitest";

// vi.mock factories are hoisted above imports, so import these lazily:
//   vi.mock("next/navigation", () => import("../helpers/mockNext").then((m) => m.navigationMock()));

/** `redirect` that throws so server actions/routes can be asserted with rejects.toThrow("REDIRECT:/path"). */
export function navigationMock() {
  return {
    redirect: vi.fn((url: string) => {
      throw new Error(`REDIRECT:${url}`);
    }),
  };
}

export function cacheMock() {
  return { revalidatePath: vi.fn() };
}

export function authActionsMock() {
  return { signInWithGitHub: vi.fn(), signOut: vi.fn() };
}

/** `next/headers` mock backed by a Map the test can populate and clear between cases. */
export function headersMock(store: Map<string, string>) {
  return {
    headers: vi.fn(async () => ({ get: (name: string) => store.get(name) ?? null })),
  };
}

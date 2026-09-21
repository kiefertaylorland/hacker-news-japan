import { beforeEach, vi } from "vitest";

export type QueryResult = { data?: unknown; error?: unknown };

/** Chainable Supabase query-builder mock; every method returns the builder and `then` resolves `result`. */
export function mockQueryBuilder(result: QueryResult) {
  const builder: Record<string, ReturnType<typeof vi.fn>> = {};
  const chain = () => builder;
  builder.select = vi.fn(chain);
  builder.eq = vi.fn(chain);
  builder.order = vi.fn(chain);
  builder.delete = vi.fn(chain);
  builder.upsert = vi.fn(async () => result);
  builder.then = vi.fn((resolve: (value: unknown) => unknown) => resolve(result));
  const from = vi.fn(() => builder);
  return { from, builder };
}

/** Supabase auth client surface used by lib/auth and the auth actions/routes. */
export function mockAuthClient() {
  return {
    getClaims: vi.fn(),
    signInWithOAuth: vi.fn(),
    signOut: vi.fn(),
    exchangeCodeForSession: vi.fn(),
  };
}

/**
 * Creates a `mockAuthClient()` and wires it into a mocked `createClient`, resetting every
 * auth method and re-resolving `createClient` before each test. Requires the caller to have
 * already done `vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }))` (vi.mock
 * is hoisted per-file, so it can't be moved in here).
 */
export function withMockedAuthClient(createClient: ReturnType<typeof vi.fn>) {
  const auth = mockAuthClient();
  beforeEach(() => {
    Object.values(auth).forEach((fn) => fn.mockReset());
    vi.mocked(createClient).mockResolvedValue({ auth } as never);
  });
  return auth;
}

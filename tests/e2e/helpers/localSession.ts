import { test as base, type Page } from "@playwright/test";
import { createServerClient } from "@supabase/ssr";
import { clientAsUser, createTestUser, deleteTestUser } from "../../integration/helpers/testUsers";

/** Each browser test gets its own real local user and SSR session; deletion cascades its data. */
export const test = base.extend<{ signedInPage: Page }>({
  signedInPage: async ({ page, baseURL }, runTest) => {
    const user = await createTestUser();
    try {
      const client = await clientAsUser(user);
      const { data } = await client.auth.getSession();
      if (!data.session) throw new Error("Missing local test session");
      const ssr = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
        cookies: {
          getAll: () => [],
          setAll: async (cookies) => {
            await page.context().addCookies(cookies.map(({ name, value }) => ({
              name, value, domain: new URL(baseURL!).hostname, path: "/", sameSite: "Lax" as const,
            })));
          },
        },
      });
      const { error } = await ssr.auth.setSession(data.session);
      if (error) throw error;
      await runTest(page);
    } finally { await deleteTestUser(user.id); }
  },
});

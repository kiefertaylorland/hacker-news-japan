import { test as setup } from "@playwright/test";
import { STORAGE_STATE } from "./storageState";
import { signInWithGitHub } from "./helpers/signIn";

// Signs in once through the real OAuth flow and saves the cookies Supabase set,
// so the bookmark specs start signed in without repeating the flow.
setup("sign in with GitHub", async ({ page }) => {
  await page.goto("/");
  await signInWithGitHub(page);
  await page.context().storageState({ path: STORAGE_STATE });
});

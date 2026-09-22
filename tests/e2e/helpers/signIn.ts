import { expect, type Page } from "@playwright/test";
import FAKE_GITHUB_USER from "../fake-github/user.json" with { type: "json" };

/**
 * Clicks "Sign in with GitHub" and follows the real redirect chain: server action →
 * GoTrue /authorize → fake GitHub → GoTrue /callback → the app's /auth/callback.
 */
export async function signInWithGitHub(page: Page): Promise<void> {
  await page.getByRole("button", { name: "Sign in with GitHub" }).click();
  await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();
  await expect(page.getByText(FAKE_GITHUB_USER.login)).toBeVisible();
}

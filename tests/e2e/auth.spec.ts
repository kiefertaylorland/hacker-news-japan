import { expect, test } from "@playwright/test";
import { signInWithGitHub } from "./helpers/signIn";

test("signing in from /saved returns to /saved, and signing out returns home", async ({ page }) => {
  await page.goto("/saved");
  await expect(page.getByText("Sign in to see saved stories")).toBeVisible();

  // `next=/saved` has to survive the server action, GoTrue and /auth/callback.
  await signInWithGitHub(page);
  await expect(page).toHaveURL(/\/saved$/);
  await expect(page.getByRole("heading", { name: "Saved stories" })).toBeVisible();

  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("button", { name: "Sign in with GitHub" })).toBeVisible();

  // The session is really gone, not just hidden client-side.
  await page.goto("/saved");
  await expect(page.getByText("Sign in to see saved stories")).toBeVisible();
});

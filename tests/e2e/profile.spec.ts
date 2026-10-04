import { expect, type Page } from "@playwright/test";
import { test } from "./helpers/localSession";

// Next keeps previously visited routes mounted but hidden, so the discussion page's copy of a comment lingers.
const visibleText = (page: Page, text: string) => page.getByText(text, { exact: true }).filter({ visible: true });

test("profile shows the user, creation time, and upvoted and favorite submissions and comments", async ({ signedInPage: page }) => {
  await page.goto("/");
  // Not the first card: upvotes.spec.ts votes on that one in parallel and asserts its exact count.
  const card = page.locator("div.group").nth(2);
  const title = (await card.getByRole("link").first().textContent())!.trim();
  await expect(card.getByRole("button", { name: "Upvote", exact: true })).toBeEnabled();
  await card.getByRole("button", { name: "Upvote", exact: true }).click();
  await expect(card.getByRole("button", { name: "Upvoted", exact: true })).toBeVisible();
  const saved = page.waitForResponse((response) =>
    response.request().method() === "POST" && Boolean(response.request().headers()["next-action"])
  );
  await card.getByRole("button", { name: "Save story" }).click();
  expect((await saved).ok()).toBe(true);

  await card.getByRole("link", { name: /comments$/ }).click();
  const body = `Profile comment ${crypto.randomUUID()}`;
  await page.getByRole("textbox", { name: "Comment", exact: true }).fill(body);
  await page.getByRole("button", { name: "Add comment" }).click();
  const comment = page.getByRole("listitem").filter({ hasText: body });
  await comment.getByRole("button", { name: "Upvote comment" }).click();
  await expect(comment.getByRole("button", { name: "Upvoted comment" })).toBeDisabled();
  await comment.getByRole("button", { name: "favorite", exact: true }).click();
  await expect(comment.getByRole("button", { name: "un-favorite" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("listitem").filter({ hasText: body }).getByRole("button", { name: "Upvoted comment" })).toHaveAttribute("aria-pressed", "true");

  await page.getByRole("link", { name: /@example\.com$/ }).click();
  await expect(page).toHaveURL(/\/profile$/);
  const profile = page.getByRole("table", { name: "Profile" });
  await expect(profile.getByRole("row", { name: /^user: integration-test-/ })).toBeVisible();
  await expect(profile.locator("time")).toHaveText(/^\w+ \d{1,2}, \d{4} at \d{1,2}:\d{2}:\d{2} [AP]M UTC$/);

  await profile.getByRole("link", { name: "upvoted submissions" }).click();
  await expect(page.getByRole("listitem").getByRole("link", { name: title, exact: true }).filter({ visible: true })).toBeVisible();
  await profile.getByRole("link", { name: "favorite submissions" }).click();
  await expect(page.getByRole("heading", { name: "Favorite submissions" })).toBeVisible();
  await expect(page.getByRole("listitem").getByRole("link", { name: title, exact: true }).filter({ visible: true })).toBeVisible();
  await profile.getByRole("link", { name: "comments" }).first().click();
  await expect(page.getByRole("heading", { name: "Upvoted comments" })).toBeVisible();
  await expect(visibleText(page, body)).toBeVisible();
  await profile.getByRole("link", { name: "comments" }).last().click();
  await expect(page.getByRole("heading", { name: "Favorite comments" })).toBeVisible();
  await expect(visibleText(page, body)).toBeVisible();
});

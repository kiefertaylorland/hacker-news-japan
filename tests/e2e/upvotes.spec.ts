import { expect } from "@playwright/test";
import { test } from "./helpers/localSession";

test("upvote once and retain the count and selected state after reload", async ({ signedInPage: page }) => {
  await page.goto("/");
  const card = page.locator("div.group").first();
  const title = (await card.getByRole("link").textContent())?.trim();
  expect(title).toBeTruthy();
  const vote = card.getByRole("button", { name: "Upvote", exact: true });
  await expect(vote).toBeEnabled();
  const points = Number(await vote.textContent());
  await vote.click();
  await expect(card.getByRole("button", { name: "Upvoted", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(card.getByRole("button", { name: "Upvoted", exact: true })).toHaveText(String(points + 1));
  await page.reload();
  const reloaded = page.locator("div.group", { hasText: title }).first();
  await expect(reloaded.getByRole("button", { name: "Upvoted", exact: true })).toHaveText(String(points + 1));
  await expect(reloaded.getByRole("button", { name: "Upvoted", exact: true })).toBeDisabled();
});

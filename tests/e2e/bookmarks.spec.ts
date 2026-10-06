import { expect, test } from "@playwright/test";
import { clearFakeUserBookmarks } from "./helpers/fakeUser";

test.beforeEach(clearFakeUserBookmarks);

// Home-page stories come from the live Algolia API (fetched server-side, so they
// can't be routed from the browser); the test saves whichever story is first.
test("save a story, see it on /saved, then unsave it", async ({ page }) => {
  await page.goto("/");
  const firstSavable = page.locator("div.group", { has: page.getByRole("button", { name: "Save story" }) });
  const title = (await firstSavable.first().getByRole("link").first().textContent())?.trim() ?? "";
  expect(title).not.toBe("");
  // Keyed by title: the "Save story" button this card was found by goes away once clicked.
  const card = page.locator("div.group", { hasText: title }).first();

  // The selected icon is optimistic; wait for persistence before navigating away.
  const saved = page.waitForResponse((response) =>
    response.request().method() === "POST" && Boolean(response.request().headers()["next-action"])
  );
  await card.getByRole("button", { name: "Save story" }).click();
  expect((await saved).ok()).toBe(true);
  await expect(card.getByRole("button", { name: "Remove bookmark" })).toHaveAttribute("aria-pressed", "true");

  await page.goto("/saved");
  await expect(page.getByRole("heading", { name: "Recommended for you" })).toBeVisible();
  const savedCard = page.locator("div.group", { hasText: title });
  await expect(savedCard).toBeVisible();

  // Persisted server-side, not just optimistic UI.
  await page.reload();
  await expect(savedCard).toBeVisible();

  await savedCard.getByRole("button", { name: "Remove bookmark" }).click();
  await expect(page.getByText("No saved stories yet")).toBeVisible();

  await page.reload();
  await expect(page.getByText("No saved stories yet")).toBeVisible();
  await expect(page.getByText("Save stories to get recommendations")).toBeVisible();
});

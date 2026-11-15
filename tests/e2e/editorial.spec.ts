import { expect } from "@playwright/test";
import { test } from "./helpers/localSession";
import { makeResults, makeStory } from "../fixtures/stories";

test("search refresh, retry, empty results, chips, pagination and history retain useful state", async ({ signedInPage: page }) => {
  let fail = false;
  let empty = false;
  let release: (() => void) | undefined;
  let hold: Promise<void> | undefined;
  await page.route("https://hn.algolia.com/**", async (route) => {
    if (hold) await hold;
    if (fail) return route.abort();
    return route.fulfill({ json: makeResults({ hits: empty ? [] : [makeStory({ title: "Editorial Japan result" })], nbHits: empty ? 0 : 60, nbPages: empty ? 0 : 2 }) });
  });
  await page.goto("/");
  const search = page.getByRole("textbox", { name: "Search Japan stories" });
  await search.fill("editorial");
  await expect(page.getByRole("article", { name: "Editorial Japan result" })).toBeVisible();
  await page.getByRole("combobox", { name: "Date range" }).click();
  await page.getByRole("option", { name: "Past Week" }).click();
  await expect(page.getByRole("button", { name: "Remove When: Past Week" })).toBeVisible();
  await page.getByRole("radio", { name: "Points", exact: true }).click();
  await expect(page.getByRole("button", { name: "Remove Sort: Points" })).toBeVisible();
  await page.getByRole("radio", { name: "Newest", exact: true }).click();
  await expect(page.getByRole("button", { name: "Next", exact: true })).toBeEnabled();
  fail = true;
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText("Previous results are still shown");
  await expect(page.getByRole("article", { name: "Editorial Japan result" })).toBeVisible();
  fail = false;
  hold = new Promise<void>((resolve) => { release = resolve; });
  await page.getByRole("button", { name: "Retry search" }).click();
  await expect(page.getByText("Updating stories… Previous results remain available.")).toBeVisible();
  release!();
  hold = undefined;
  await expect(page.getByRole("main").getByRole("alert")).toHaveCount(0);
  await expect(page).toHaveURL(/page=1/);
  await page.goBack();
  await expect(page).toHaveURL(/page=0/);
  empty = true;
  await search.fill("nothing matches");
  await expect(page.getByText("No stories found")).toBeVisible();
  await page.getByRole("button", { name: "Clear filters and browse stories" }).click();
  await expect(search).toHaveValue("");
  await expect(page.getByRole("button", { name: /Remove Search:/ })).toHaveCount(0);
  await page.getByRole("radio", { name: "Jobs", exact: true }).click();
  await expect(page.getByRole("button", { name: "Remove Type: Jobs" })).toBeVisible();
  await page.getByRole("button", { name: "Reset all" }).click();
  await expect(page.getByRole("radio", { name: "All Stories", exact: true })).toHaveAttribute("data-state", "on");
});

test("failed save and unsave roll back, retry, persist and recover keyboard focus", async ({ signedInPage: page }) => {
  let failNext = true;
  await page.route("**/*", async (route) => {
    const request = route.request();
    if (failNext && request.method() === "POST" && request.headers()["next-action"]) {
      failNext = false;
      return route.fulfill({ status: 500, contentType: "text/plain", body: "Synthetic bookmark failure" });
    }
    return route.continue();
  });
  await page.goto("/");
  const row = page.getByRole("article").first();
  const title = await row.getByRole("heading").innerText();
  await row.getByRole("button", { name: "Save story", exact: true }).click();
  await expect(row.getByRole("alert")).toContainText("previous saved state has been restored");
  await expect(row.getByRole("button", { name: "Save story", exact: true })).toHaveAttribute("aria-pressed", "false");
  await row.getByRole("button", { name: "Retry bookmark" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Story saved." })).toBeVisible();
  await page.goto("/saved");
  const saved = page.getByRole("article", { name: title, exact: true });
  await expect(saved).toBeVisible();
  failNext = true;
  await saved.getByRole("button", { name: "Remove bookmark", exact: true }).click();
  await expect(saved.getByRole("alert")).toContainText("previous saved state has been restored");
  await expect(saved.getByRole("button", { name: "Remove bookmark", exact: true })).toBeFocused();
  await saved.getByRole("button", { name: "Retry bookmark" }).click();
  await expect(page.getByText("No saved stories yet")).toBeVisible();
  await page.reload();
  await expect(page.getByText("No saved stories yet")).toBeVisible();
});

test.describe("touch and responsive accessibility", () => {
  test.use({ hasTouch: true });

  test("long filter text fits narrow layouts, reduced motion disables animation and offline is recoverable", async ({ signedInPage: page }) => {
    await page.route("https://hn.algolia.com/**", (route) => route.fulfill({ json: makeResults() }));
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    expect(await page.evaluate(() => matchMedia("(pointer: coarse)").matches)).toBe(true);
    const search = page.getByRole("textbox", { name: "Search Japan stories" });
    await search.tap();
    await search.fill("x".repeat(250));
    const story = page.getByRole("article", { name: "Building in Japan", exact: true });
    await expect(story).toBeVisible();
    const jobs = page.getByRole("radio", { name: "Jobs", exact: true });
    await jobs.tap();
    await expect(jobs).toHaveAttribute("data-state", "on");
    for (const width of [320, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
      for (const target of [story.getByRole("button", { name: "Save story", exact: true }), jobs, page.getByRole("combobox", { name: "Date range" })]) {
        const box = await target.boundingBox();
        expect(box).not.toBeNull();
        expect(box!.height).toBeGreaterThanOrEqual(44);
      }
    }
    expect(await page.getByRole("article").first().evaluate((node) => getComputedStyle(node).transitionDuration)).toBe("0s");
    await page.context().setOffline(true);
    await expect(page.getByRole("main").getByRole("alert")).toContainText("appear to be offline");
    await page.context().setOffline(false);
    await expect(page.getByText(/appear to be offline/)).toHaveCount(0);
    await page.setViewportSize({ width: 320, height: 900 });
    for (const path of ["/saved", "/profile"]) {
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    }
    await page.goto("/");
    await page.keyboard.press("Tab");
    await expect(page.getByRole("link", { name: "Skip to content" })).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("main")).toBeFocused();
  });
});

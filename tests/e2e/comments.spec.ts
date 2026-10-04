import { expect } from "@playwright/test";
import { test } from "./helpers/localSession";

test("open a same-site discussion, post a comment, and see it after reload", async ({ signedInPage: page }) => {
  await page.goto("/");
  const link = page.getByRole("link", { name: /comments$/ }).first();
  const href = await link.getAttribute("href");
  await link.click();
  await expect(page).toHaveURL(new RegExp(`${href}$`));
  await expect(page.getByRole("heading", { name: "Comments", exact: true })).toBeVisible();
  const body = `Browser comment ${crypto.randomUUID()}`;
  await page.getByRole("textbox", { name: "Comment", exact: true }).fill(body);
  await page.getByRole("button", { name: "Add comment" }).click();
  await expect(page.getByRole("status")).toHaveText("Comment posted.");
  await expect(page.getByText(body, { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText(body, { exact: true })).toBeVisible();
});

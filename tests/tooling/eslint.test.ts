import { existsSync } from "node:fs";
import path from "node:path";
import { ESLint } from "eslint";
import { describe, expect, it } from "vitest";

const root = process.cwd();
async function messages(code: string, filePath = "src/lint-fixture.ts") {
  const eslint = new ESLint({ cwd: root });
  const [result] = await eslint.lintText(code, { filePath });
  return result.messages;
}

describe("ESLint flat configuration", () => {
  it("uses only the flat config and a supported ESLint major", () => {
    expect(existsSync(path.join(root, "eslint.config.mjs"))).toBe(true);
    expect(existsSync(path.join(root, ".eslintrc.json"))).toBe(false);
    expect(Number(ESLint.version.split(".")[0])).toBeGreaterThanOrEqual(9);
  });

  it.each([
    ["export const value: any = 1;", "@typescript-eslint/no-explicit-any"],
    ["// @ts-ignore\nexport const value = 1;", "@typescript-eslint/ban-ts-comment"],
    ["export const value = document.querySelector('div')!;", "@typescript-eslint/no-non-null-assertion"],
    ["const unused = 1; export {};", "@typescript-eslint/no-unused-vars"],
    ["console.log('debug');", "no-console"],
  ])("preserves the %s restriction", async (code, rule) => {
    expect(await messages(code)).toEqual(expect.arrayContaining([expect.objectContaining({ ruleId: rule })]));
  });

  it("allows described expectations, underscore variables and permitted console methods", async () => {
    expect(await messages("// @ts-expect-error: regression fixture\nexport const value: string = 1; const _unused = 1; console.warn('warning'); console.error('error');")).toEqual([]);
  });

  it("allows non-null assertions in tests only", async () => {
    expect(await messages("export const value = document.querySelector('div')!;", "tests/lint-fixture.ts")).toEqual([]);
  });
});

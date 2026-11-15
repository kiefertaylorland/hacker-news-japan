// Reproducible local lab proxies, not production INP or real-user metrics.
// BASE_URL=http://localhost:3000 BUILD_DIR=.next node scripts/measure-ui.mjs
import { readFile, writeFile } from "node:fs/promises";
import { resolve, sep } from "node:path";
import { gzipSync } from "node:zlib";
import { randomUUID } from "node:crypto";
import { chromium } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";

const baseURL = new URL(process.env.BASE_URL ?? "");
const buildDir = resolve(process.env.BUILD_DIR ?? ".next");
const runs = Number(process.env.RUNS ?? 5);
if (!["http:", "https:"].includes(baseURL.protocol)) throw new Error("BASE_URL must be HTTP(S).");
if (!Number.isInteger(runs) || runs < 1 || runs > 100) throw new Error("RUNS must be an integer from 1 to 100.");
const isLocal = (url) => ["localhost", "127.0.0.1", "[::1]"].includes(new URL(url).hostname);
const round = (value) => Math.round(value * 1000) / 1000;
const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return round(sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2);
};

let browser;
let cleanupUser;
let storageState = process.env.PERF_STORAGE_STATE;
let sessionSource = storageState ? "PERF_STORAGE_STATE" : null;
const localEnv = ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "SUPABASE_SERVICE_ROLE_KEY"];
try {
  console.error("[ui-perf] preparing session");
  // Only synthetic local users may be provisioned. Never print credentials/session data.
  if (!storageState && localEnv.every((name) => process.env[name])) {
    const [url, key, adminKey] = localEnv.map((name) => process.env[name]);
    if (!isLocal(baseURL) || !isLocal(url)) throw new Error("Synthetic performance users require localhost app and Supabase URLs.");
    const authOptions = { auth: { persistSession: false, autoRefreshToken: false } };
    const admin = createClient(url, adminKey, authOptions);
    const email = `ui-perf-${randomUUID()}@example.com`;
    const password = randomUUID();
    console.error("[ui-perf] creating synthetic local user");
    const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
    if (created.error) throw created.error;
    cleanupUser = async () => {
      const { error } = await admin.auth.admin.deleteUser(created.data.user.id);
      if (error) throw new Error("Could not delete the synthetic performance user.");
    };
    const client = createClient(url, key, authOptions);
    const signedIn = await client.auth.signInWithPassword({ email, password });
    if (signedIn.error || !signedIn.data.session) throw new Error("Could not create the local performance session.");
    const cookies = [];
    const ssr = createServerClient(url, key, { cookies: { getAll: () => cookies, setAll: (values) => {
      cookies.splice(0, cookies.length, ...values.map(({ name, value }) => ({ name, value,
        domain: baseURL.hostname, path: "/", sameSite: "Lax", secure: baseURL.protocol === "https:" })));
    } } });
    console.error("[ui-perf] encoding local SSR session");
    const { error } = await ssr.auth.setSession(signedIn.data.session);
    if (error) throw new Error("Could not encode the local SSR session.");
    storageState = { cookies, origins: [] };
    sessionSource = "synthetic local Supabase user (deleted after run)";
  }

  console.error("[ui-perf] launching measurement browser");
  browser = await chromium.launch({ headless: true });
  const measurements = [];
  for (let run = 1; run <= runs; run++) {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 },
      locale: "en-US", timezoneId: "UTC", reducedMotion: "no-preference", ...(storageState ? { storageState } : {}) });
    try {
      const page = await context.newPage();
      page.setDefaultTimeout(15_000);
      const progress = (stage) => console.error(`[ui-perf ${run}/${runs}] ${stage}`);
      progress("startup");
      const scripts = new Set();
      page.on("request", (request) => {
        const url = new URL(request.url());
        if (request.resourceType() === "script" && url.origin === baseURL.origin && url.pathname.startsWith("/_next/static/")) scripts.add(url.pathname);
      });
      await page.addInitScript(() => {
        window.__uiPerf = { cls: 0, searchMs: null, saveMs: null };
        let cluster = 0, start = 0, last = 0;
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.hadRecentInput) continue;
            if (entry.startTime - last < 1000 && entry.startTime - start < 5000) cluster += entry.value;
            else { cluster = entry.value; start = entry.startTime; }
            last = entry.startTime;
            window.__uiPerf.cls = Math.max(window.__uiPerf.cls, cluster);
          }
        }).observe({ type: "layout-shift", buffered: true });
      });
      const title = `Japan UI performance fixture ${run}`;
      const story = { objectID: String(900000000 + run), story_id: 900000000 + run,
        title, url: "https://example.com/ui-performance", author: "ui-perf", points: 42,
        num_comments: 3, created_at: "2026-11-01T00:00:00Z", created_at_i: 1793491200, _tags: ["story"] };
      await page.route("https://hn.algolia.com/api/v1/**", (route) => {
        const query = new URL(route.request().url()).searchParams.get("query") ?? "";
        const hit = { ...story, title: query.includes("ui-perf") ? title : "Japan startup fixture" };
        return route.fulfill({ json: { hits: [hit], nbHits: 1, nbPages: 1, page: 0,
          hitsPerPage: 30, query, processingTimeMS: 0 } });
      });
      await page.goto(new URL("/", baseURL).href, { waitUntil: "load", timeout: 60_000 });
      const search = page.getByRole("textbox", { name: "Search Japan stories", exact: true });
      await search.waitFor();
      // Fixed startup observation window includes deferred imports; each run has a fresh context/cache.
      await page.waitForTimeout(1000);
      const startupScripts = [];
      for (const pathname of [...scripts].sort()) {
        const file = resolve(buildDir, decodeURIComponent(pathname).replace(/^\/_next\//, ""));
        if (!pathname.startsWith("/_next/static/") || !file.startsWith(`${buildDir}${sep}`)) throw new Error(`Cannot map startup script to BUILD_DIR: ${pathname}`);
        const body = await readFile(file);
        startupScripts.push({ path: pathname, rawBytes: body.length, gzipBytes: gzipSync(body, { level: 9 }).length });
      }
      const initialCLS = await page.evaluate(() => window.__uiPerf.cls);
      await page.evaluate((fixtureTitle) => {
        const state = window.__uiPerf;
        document.addEventListener("input", (event) => {
          if (event.target.getAttribute("aria-label") === "Search Japan stories") state.searchStart = performance.now();
        }, true);
        document.addEventListener("click", (event) => {
          if (event.target.closest('button[aria-label="Save story"]')) state.saveStart = performance.now();
        }, true);
        let searchScheduled = false, saveScheduled = false;
        new MutationObserver(() => {
          if (state.searchStart !== undefined && !searchScheduled && [...document.links].some((link) => link.textContent.trim() === fixtureTitle)) {
            searchScheduled = true;
            requestAnimationFrame(() => { state.searchMs = performance.now() - state.searchStart; });
          }
          if (state.saveStart !== undefined && !saveScheduled && document.querySelector('button[aria-label="Remove bookmark"][aria-pressed="true"]')) {
            saveScheduled = true;
            requestAnimationFrame(() => { state.saveMs = performance.now() - state.saveStart; });
          }
        }).observe(document.body, { childList: true, characterData: true, subtree: true, attributes: true, attributeFilter: ["aria-pressed"] });
      }, title);
      progress("search");
      await search.fill("ui-perf");
      await page.waitForFunction(() => window.__uiPerf.searchMs !== null);
      progress("search measured");
      let save = { status: "NOT RUN", reason: "No PERF_STORAGE_STATE or complete local Supabase environment supplied." };
      if (storageState && isLocal(baseURL)) {
        progress("save");
        const row = page.locator("article.group, div.group").filter({ has: page.getByRole("link", { name: title, exact: true }) });
        const saveButton = row.getByRole("button", { name: "Save story", exact: true });
        await saveButton.waitFor();
        const persisted = page.waitForResponse((response) => response.request().method() === "POST" && Boolean(response.request().headers()["next-action"]), { timeout: 15_000 });
        await saveButton.click();
        await page.waitForFunction(() => window.__uiPerf.saveMs !== null);
        progress("save feedback measured; awaiting response headers");
        const savedResponse = await persisted;
        if (!savedResponse.ok()) throw new Error("Performance bookmark request failed.");
        progress("save response headers received");
        save = { status: "MEASURED", clickToOptimisticFrameMs: round(await page.evaluate(() => window.__uiPerf.saveMs)), httpStatus: savedResponse.status() };
        // A server-action revalidation may replace the browser-only fixture. Search
        // once more before cleanup so both the original UI and redesign can find it.
        progress("save cleanup");
        await search.fill("ui-perf-cleanup");
        const removeButton = row.getByRole("button", { name: "Remove bookmark", exact: true });
        await removeButton.waitFor();
        const removed = page.waitForResponse((response) => response.request().method() === "POST" && Boolean(response.request().headers()["next-action"]), { timeout: 15_000 });
        await removeButton.click();
        if (!(await removed).ok()) throw new Error("Could not remove the performance bookmark.");
        progress("cleanup response headers received");
      } else if (storageState) save = { status: "NOT RUN", reason: "Save measurements are restricted to localhost to avoid production writes." };
      const timing = await page.evaluate(() => ({ cls: window.__uiPerf.cls, searchMs: window.__uiPerf.searchMs }));
      measurements.push({ run, initialCLS: round(initialCLS), finalCLS: round(timing.cls),
        searchInputToResultsFrameMs: round(timing.searchMs), save,
        startupJavaScript: { rawBytes: startupScripts.reduce((sum, script) => sum + script.rawBytes, 0),
          gzipBytes: startupScripts.reduce((sum, script) => sum + script.gzipBytes, 0), scripts: startupScripts } });
      progress("complete");
    } finally { await context.close(); }
  }
  const saves = measurements.filter((run) => run.save.status === "MEASURED");
  const report = { kind: "lab proxies; not production INP or real-user metrics", baseURL: baseURL.origin,
    browser: browser.version(), node: process.version, runs, viewport: "1280x900", sessionSource,
    methodology: "Fresh browser context per run; Next.js startup scripts under /_next/static/ requested through load + 1000ms, summed per-file gzip level 9 from BUILD_DIR; hosted telemetry scripts are excluded. Standard CLS session windows. Search uses an immediate browser Algolia stub, includes the existing 300ms debounce, ends at the next result frame. Save ends at the next optimistic selected frame; the script checks HTTP success status only, while database persistence is verified independently by E2E tests. SSR content and server latency remain live.",
    medians: { initialCLS: median(measurements.map((run) => run.initialCLS)),
      finalCLS: median(measurements.map((run) => run.finalCLS)),
      searchInputToResultsFrameMs: median(measurements.map((run) => run.searchInputToResultsFrameMs)),
      startupJavaScriptRawBytes: median(measurements.map((run) => run.startupJavaScript.rawBytes)),
      startupJavaScriptGzipBytes: median(measurements.map((run) => run.startupJavaScript.gzipBytes)),
      saveClickToOptimisticFrameMs: saves.length ? median(saves.map((run) => run.save.clickToOptimisticFrameMs)) : "NOT RUN" }, measurements };
  const json = `${JSON.stringify(report, null, 2)}\n`;
  if (process.env.OUTPUT_PATH) await writeFile(resolve(process.env.OUTPUT_PATH), json);
  process.stdout.write(json);
} finally {
  try { await browser?.close(); } finally { await cleanupUser?.(); }
}

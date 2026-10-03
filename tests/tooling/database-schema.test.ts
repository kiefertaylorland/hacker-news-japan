import { execFile } from "node:child_process";
import { createServer, type Server } from "node:http";
import path from "node:path";
import { promisify } from "node:util";
import { afterEach, describe, expect, it } from "vitest";

const execute = promisify(execFile);
const script = path.join(process.cwd(), "scripts/check-database-schema.mjs");
const servers: Server[] = [];

async function database(missingPath?: string) {
  const requests: { method: string; path: string; body: string; key?: string }[] = [];
  const server = createServer(async (request, response) => {
    let body = "";
    for await (const chunk of request) body += chunk;
    requests.push({ method: request.method ?? "", path: request.url ?? "", body, key: request.headers.apikey as string });
    response.writeHead(request.url?.startsWith(missingPath ?? "missing") ? 404 : 200, { "Content-Type": "application/json" });
    response.end(request.url?.includes("rpc/") ? "0" : "[]");
  });
  servers.push(server);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Missing fixture address");
  return { requests, url: `http://127.0.0.1:${address.port}` };
}

function check(url: string, feature: string, overrides: Partial<NodeJS.ProcessEnv> = {}) {
  return execute(process.execPath, [script, feature], {
    env: {
      ...process.env,
      VERCEL: "1",
      NEXT_PUBLIC_SUPABASE_URL: url,
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_fixture",
      ...overrides,
    },
  });
}

afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => new Promise<void>((resolve) => server.close(() => resolve()))));
});

describe("deployment database schema check", () => {
  it("checks the deployed comments schema without reading user data", async () => {
    const { url, requests } = await database();
    expect((await check(url, "comments")).stdout).toContain("Database schema check passed");
    expect(requests).toEqual([{ method: "GET", path: "/rest/v1/comments?select=id,author,body,created_at&limit=0", body: "", key: "sb_publishable_fixture" }]);
  });

  it("checks private vote rows and the public aggregate RPC using the publishable key", async () => {
    const { url, requests } = await database();
    await check(url, "votes");
    expect(requests).toEqual([
      { method: "GET", path: "/rest/v1/votes?select=user_id,story_id&limit=0", body: "", key: "sb_publishable_fixture" },
      { method: "POST", path: "/rest/v1/rpc/story_vote_count", body: JSON.stringify({ requested_story_id: "1" }), key: "sb_publishable_fixture" },
    ]);
  });

  it.each([
    ["comments", "/rest/v1/comments"],
    ["votes", "/rest/v1/votes"],
    ["votes", "/rest/v1/rpc/story_vote_count"],
  ])("blocks publishing when %s is missing %s", async (feature, missingPath) => {
    const { url } = await database(missingPath);
    const result = await check(url, feature).catch((error) => error);
    expect(result).toMatchObject({ code: 1, stderr: expect.stringContaining("Apply the committed Supabase migrations") });
    expect(result.stderr).not.toContain("sb_publishable_fixture");
  });

  it("does not contact hosted databases during local or CI builds", async () => {
    const { url, requests } = await database("/rest/v1/");
    expect((await check(url, "comments", { VERCEL: "" })).stdout).toBe("");
    expect(requests).toEqual([]);
  });

  it("fails with configuration guidance when Vercel has no database key", async () => {
    const { url, requests } = await database();
    await expect(check(url, "comments", { NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "" })).rejects.toMatchObject({ code: 1, stderr: expect.stringContaining("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY") });
    expect(requests).toEqual([]);
  });

  it("rejects unsupported feature names", async () => {
    const { url, requests } = await database();
    await expect(check(url, "unknown")).rejects.toMatchObject({ code: 1, stderr: expect.stringContaining("Unknown database feature") });
    expect(requests).toEqual([]);
  });
});

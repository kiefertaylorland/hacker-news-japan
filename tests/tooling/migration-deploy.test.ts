import { execFile } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { afterEach, describe, expect, it } from "vitest";

const execute = promisify(execFile);
const root = process.cwd();
const directories: string[] = [];
const versions = ["20260920000000", "20261002035730"];
type Row = { local: string; remote: string };

async function fixture(rows: Row[], flags: Record<string, boolean> = {}) {
  const directory = await mkdtemp(path.join(os.tmpdir(), "migration ci-"));
  directories.push(directory);
  await mkdir(path.join(directory, "supabase/migrations"), { recursive: true });
  for (const version of versions) {
    await writeFile(path.join(directory, `supabase/migrations/${version}_fixture.sql`), "-- fixture");
  }
  const state = path.join(directory, "state.json");
  const trace = path.join(directory, "trace.jsonl");
  const history = path.join(directory, "history.json");
  const output = path.join(directory, "output.txt");
  await writeFile(state, JSON.stringify({ migrations: rows, ...flags }));
  await writeFile(history, JSON.stringify({ migrations: rows }));
  const cli = path.join(directory, "fake-supabase.mjs");
  await writeFile(cli, `#!/usr/bin/env node
import fs from 'node:fs';
const args = process.argv.slice(2);
fs.appendFileSync(process.env.FAKE_TRACE, JSON.stringify(args) + '\\n');
const state = JSON.parse(fs.readFileSync(process.env.FAKE_STATE, 'utf8'));
if (args[0] === 'migration') console.log(JSON.stringify({migrations: state.migrations}));
if (args[0] === 'db' && args[1] === 'push' && !args.includes('--dry-run')) {
  if (state.failPush) process.exit(23);
  if (!state.leavePending) {
    state.migrations = state.migrations.map(row => ({...row, remote: row.local || row.remote}));
    fs.writeFileSync(process.env.FAKE_STATE, JSON.stringify(state));
  }
}
if (args[0] === 'db' && args[1] === 'lint' && state.failLint) process.exit(24);
`, { mode: 0o755 });
  return {
    directory, history, state, output,
    verify: (pending = false) => execute(process.execPath, [path.join(root, "scripts/verify-migration-history.mjs"), history, ...(pending ? ["--allow-pending"] : [])], { cwd: directory }),
    deploy: (target = "--local", env: Partial<NodeJS.ProcessEnv> = {}) => execute("bash", [path.join(root, "scripts/deploy-migrations.sh"), target], {
      cwd: directory,
      env: { ...process.env, SUPABASE_BIN: cli, FAKE_STATE: state, FAKE_TRACE: trace, GITHUB_OUTPUT: output, RUNNER_TEMP: directory, ...env },
    }),
    commands: async (): Promise<string[][]> => (await readFile(trace, "utf8")).trim().split("\n").map((line) => JSON.parse(line)),
  };
}

afterEach(async () => { await Promise.all(directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true }))); });

describe("migration history verification", () => {
  it("accepts complete history and reports pending versions only in planning mode", async () => {
    const f = await fixture(versions.map((local) => ({ local, remote: local })));
    expect(JSON.parse((await f.verify()).stdout)).toEqual({ applied: 2, pending: [] });
    await writeFile(f.history, JSON.stringify({ migrations: [{ local: versions[0], remote: versions[0] }] }));
    expect(JSON.parse((await f.verify(true)).stdout).pending).toEqual([versions[1]]);
    await expect(f.verify()).rejects.toMatchObject({ code: 1, stderr: expect.stringContaining("still missing") });
  });

  it("rejects database-only history before attempting a push", async () => {
    const f = await fixture([{ local: "", remote: "20261003000000" }]);
    await expect(f.deploy()).rejects.toMatchObject({ code: 1, stderr: expect.stringContaining("missing from this checkout") });
    expect(await f.commands()).toHaveLength(1);
  });

  it("rejects duplicate and invalid migration filenames", async () => {
    const f = await fixture([]);
    const duplicate = path.join(f.directory, `supabase/migrations/${versions[0]}_duplicate.sql`);
    await writeFile(duplicate, "-- fixture");
    await expect(f.verify(true)).rejects.toMatchObject({ code: 1, stderr: expect.stringContaining("Duplicate migration") });
    await rm(duplicate);
    await writeFile(path.join(f.directory, "supabase/migrations/bad.sql"), "-- fixture");
    await expect(f.verify(true)).rejects.toMatchObject({ code: 1, stderr: expect.stringContaining("Invalid migration filename") });
  });

  it.each([{ migrations: null }, { migrations: [{ local: null, remote: "" }] }, { migrations: [{ local: "bad", remote: "" }] }])("fails closed for unsupported history output %j", async (history) => {
    const f = await fixture([]);
    await writeFile(f.history, JSON.stringify(history));
    await expect(f.verify(true)).rejects.toMatchObject({ code: 1 });
  });
});

describe("migration deployment", () => {
  it("plans, applies older missing migrations, verifies history, and lints", async () => {
    const f = await fixture([{ local: versions[0], remote: "" }, { local: versions[1], remote: versions[1] }]);
    expect((await f.deploy()).stdout).toContain("1 pending migrations applied");
    expect(await f.commands()).toEqual([
      ["migration", "list", "--local", "--output-format", "json"],
      ["db", "push", "--local", "--include-all", "--skip-vault", "--dry-run", "--yes"],
      ["db", "push", "--local", "--include-all", "--skip-vault", "--yes"],
      ["migration", "list", "--local", "--output-format", "json"],
      ["db", "lint", "--local", "--level", "error", "--fail-on", "error"],
    ]);
    expect(await readFile(f.output, "utf8")).toBe("pending_count=1\n");
    expect((await f.deploy()).stdout).toContain("0 pending migrations applied");
  });

  it.each([{ failPush: true }, { leavePending: true }, { failLint: true }])("does not report success after a failed apply or verification %j", async (flags) => {
    const f = await fixture(versions.map((local) => ({ local, remote: "" })), flags);
    await expect(f.deploy()).rejects.toMatchObject({ code: expect.any(Number) });
    await expect(readFile(f.output, "utf8")).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("requires hosted credentials before any CLI command", async () => {
    const f = await fixture([]);
    await expect(f.deploy("--linked", { SUPABASE_ACCESS_TOKEN: "" })).rejects.toMatchObject({ code: 1, stderr: expect.stringContaining("Missing SUPABASE_ACCESS_TOKEN") });
    await expect(f.commands()).rejects.toMatchObject({ code: "ENOENT" });
  });
});

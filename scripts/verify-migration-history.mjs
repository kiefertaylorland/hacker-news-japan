import { readdirSync, readFileSync } from "node:fs";

try {
  const [historyFile, option] = process.argv.slice(2);
  if (!historyFile || (option && option !== "--allow-pending")) {
    throw new Error("Usage: node scripts/verify-migration-history.mjs <history.json> [--allow-pending]");
  }
  const local = new Set();
  for (const file of readdirSync("supabase/migrations").filter((name) => name.endsWith(".sql"))) {
    const match = /^(\d{14})_[a-z0-9_]+\.sql$/.exec(file);
    if (!match) throw new Error(`Invalid migration filename: ${file}`);
    if (local.has(match[1])) throw new Error(`Duplicate migration version: ${match[1]}`);
    local.add(match[1]);
  }
  if (!local.size) throw new Error("No committed migrations found.");
  const history = JSON.parse(readFileSync(historyFile, "utf8"));
  if (!Array.isArray(history.migrations)) throw new Error("Unrecognized Supabase migration history output.");
  const remote = new Set();
  for (const row of history.migrations) {
    if (!row || typeof row.remote !== "string" || typeof row.local !== "string") {
      throw new Error("Unrecognized Supabase migration history row.");
    }
    for (const version of [row.local, row.remote].filter(Boolean)) {
      if (!/^\d{14}$/.test(version)) throw new Error(`Invalid history version: ${version}`);
      if (!local.has(version)) throw new Error(`Migration ${version} is in database history but missing from this checkout. Merge the migration PRs before deploying; do not repair history automatically.`);
    }
    if (row.remote) {
      if (remote.has(row.remote)) throw new Error(`Duplicate remote migration version: ${row.remote}`);
      remote.add(row.remote);
    }
  }
  const pending = [...local].filter((version) => !remote.has(version)).sort();
  if (pending.length && option !== "--allow-pending") {
    throw new Error(`Migrations still missing from the database: ${pending.join(", ")}`);
  }
  console.info(JSON.stringify({ applied: remote.size, pending }));
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}

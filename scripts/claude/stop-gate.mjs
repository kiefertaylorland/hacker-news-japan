// Claude Code Stop hook: before the agent may finish a turn that changed code, run the
// quick verification gate (scripts/ci-local.sh --quick). A red gate blocks the stop
// (exit 2 → stderr goes back to Claude) so "done" always means "gate passes".
import { execFileSync, spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";

const input = JSON.parse(readFileSync(0, "utf8"));
// Already blocked once this turn and Claude is retrying the stop — don't loop forever.
if (input.stop_hook_active) process.exit(0);

const root = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();
const changed = execFileSync("git", ["status", "--porcelain", "--", "src", "tests", "supabase"], {
  cwd: root,
  encoding: "utf8",
});
// No code changes (e.g. a Q&A turn) — nothing to verify.
if (!changed.trim()) process.exit(0);

const gate = spawnSync("bash", ["scripts/ci-local.sh", "--quick"], { cwd: root, encoding: "utf8" });
if (gate.status !== 0) {
  const tail = `${gate.stdout}${gate.stderr}`.trim().split("\n").slice(-60).join("\n");
  process.stderr.write(`Verification gate failed — fix the source (not the assertions) before finishing:\n${tail}\n`);
  process.exit(2);
}

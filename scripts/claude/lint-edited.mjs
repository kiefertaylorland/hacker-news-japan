// Claude Code PostToolUse hook: lint the file an Edit/Write just touched and feed any
// errors straight back to the agent (exit 2 → stderr is shown to Claude), so AI-written
// code gets fixed in the loop rather than at commit time. Typechecking is left to tsc in
// the Stop gate / pre-commit.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";

const input = JSON.parse(readFileSync(0, "utf8"));
const root = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();
const filePath = input.tool_input?.file_path;
if (!filePath) process.exit(0);

const rel = path.relative(root, path.resolve(root, filePath));
if (!/^(src|tests)\/.*\.tsx?$/.test(rel)) process.exit(0);

try {
  execFileSync("npx", ["eslint", rel], { cwd: root, encoding: "utf8", stdio: "pipe" });
} catch (err) {
  process.stderr.write(`ESLint errors in ${rel} — fix before continuing:\n${err.stdout || err.stderr}`);
  process.exit(2);
}

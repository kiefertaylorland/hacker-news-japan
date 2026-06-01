# Plan: Install the Mobbin MCP server

> Prior task (shadcn + Tailwind CLIs/MCP servers) completed successfully — see git/`.mcp.json`. This plan supersedes it for the new goal.

## Context

Goal: install the **Mobbin MCP server** so Claude Code can pull design references from Mobbin's library. Mobbin's official MCP is a remote **HTTP** server at `https://api.mobbin.com/mcp` that uses a **browser-based OAuth flow** and a (paid) Mobbin account.

Because the server is gated to a **personal Mobbin account** (OAuth), it belongs at **user scope**, not in the repo's project `./.mcp.json` (which is committed and shared). This differs from the prior shadcn/tailwind servers, which were project-scoped shared dev tools.

## Step

Add the official Mobbin HTTP MCP server at user scope:
```bash
claude mcp add mobbin --scope user --transport http https://api.mobbin.com/mcp
```

Authentication is interactive (browser OAuth) and cannot be completed by me non-interactively. After the server is added, the user completes auth in a new Claude Code session:
1. Run `/mcp` (or restart the session).
2. Select **mobbin** → **Authenticate** → a browser opens → sign in with the Mobbin account to authorize.

## Files touched
- **User-level Claude config** (`~/.claude.json` / user MCP config) — NOT the repo. No project files change.

## Verification
1. `claude mcp list` → `mobbin` appears (will show "Needs authentication" until the browser OAuth is done — expected).
2. After the user authenticates via `/mcp`, the entry shows `✓ Connected` and Mobbin search tools become available.

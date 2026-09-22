import { createServer, type ServerResponse } from "node:http";
// The GitHub account everyone is signed in as; the specs read the same file.
import FAKE_GITHUB_USER from "./user.json" with { type: "json" };

/**
 * Stands in for github.com during E2E runs. Local GoTrue's GitHub provider is
 * pointed here (GitHub Enterprise mode, see scripts/e2e.sh), so the browser still
 * goes through the app's real server action, GoTrue's authorize redirect, the PKCE
 * code exchange and /auth/callback — only GitHub's own login page is replaced.
 */
const PORT = Number(process.env.FAKE_GITHUB_PORT ?? 4010);

function sendJson(res: ServerResponse, body: unknown) {
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}

const server = createServer((req, res) => {
  const url = new URL(req.url ?? "/", `http://${req.headers.host}`);

  switch (url.pathname) {
    // The browser lands here from GoTrue; "approve" instantly and send it back.
    case "/login/oauth/authorize": {
      const callback = new URL(url.searchParams.get("redirect_uri") ?? "");
      callback.searchParams.set("code", "fake-github-code");
      callback.searchParams.set("state", url.searchParams.get("state") ?? "");
      res.writeHead(302, { Location: callback.toString() });
      res.end();
      return;
    }
    // GoTrue (server-to-server) trades the code for a token, then reads the profile.
    case "/login/oauth/access_token":
      return sendJson(res, { access_token: "fake-github-token", token_type: "bearer", scope: "user:email" });
    case "/api/v3/user":
      return sendJson(res, FAKE_GITHUB_USER);
    case "/api/v3/user/emails":
      return sendJson(res, [{ email: FAKE_GITHUB_USER.email, primary: true, verified: true }]);
    // Playwright's webServer readiness probe.
    case "/health":
      return sendJson(res, { ok: true });
    default:
      res.writeHead(404);
      res.end();
  }
});

// 0.0.0.0 so the GoTrue container can reach it through the Docker host gateway.
server.listen(PORT, "0.0.0.0");

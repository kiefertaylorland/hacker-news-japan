# Production readiness audit — 2026-10-24

Baseline: default `main` at `14381c3` (merged README PR #75). Fresh isolated clone; no existing worktree modified. No AGENTS.md or .agents/skills exists in this checkout; read CLAUDE.md and installed Next.js headers/CSP guides. Findings were prioritized before code changes. This is a bounded readiness review, not an exhaustive security assessment.

## Sources and scope

- [Current Vercel checklist](https://vercel.com/docs/production-checklist), last updated August 11, 2026.
- [Hobby plan](https://vercel.com/docs/plans/hobby), [fair use](https://vercel.com/docs/limits/fair-use-guidelines), [security headers](https://vercel.com/docs/cdn-security/security-headers).
- [Supabase production checklist](https://supabase.com/docs/guides/deployment/going-into-prod).
- Read-only Vercel project/deployment/team/drains/firewall API and Supabase project/organization/advisors. One ordinary public homepage GET; no production writes, sign-in, attack probes or load tests.

Inventory: Next.js 16 App Router / React 19 / TypeScript / Tailwind 4; npm lockfile; Cache Components and remote public-search cache. Supabase Postgres 17, GitHub OAuth, cookie refresh proxy, publishable-key clients, RLS-protected bookmarks/comments/votes/reactions. Algolia supplies HN content. Vercel Git deployments and GitHub Actions; no Cloudflare Worker/config found, so a Worker deployment checklist is not applicable. Sentry tracing/replay/tunnel, Vercel Analytics and Speed Insights are installed. Production deployment is READY at the baseline commit, Node 24, function region `iad1`; database region `us-west-1`.

Supabase organization reports **Free**. User reports Vercel Free; its MCP team response omits billing. Existing CLI has no usable authentication token (403); dashboard navigation reached a login screen, and no login was attempted. Vercel plan remains **unverified**, with Hobby assumptions used below. Do not infer a paid plan from a team name.

## Prioritized findings before implementation

| Priority | Finding and evidence | Decision |
| --- | --- | --- |
| P1 | Locked dependencies have critical/high advisories, including Next.js Server Actions DoS; Server Actions are used. Initial npm audit: 10 affected package entries (1 critical, 4 high, 5 moderate). Image/SVG and typed-array cache RCE prerequisites were not demonstrated by this app. | Update compatible releases, inspect lock diff, run full gates. No exploit attempted. |
| P1 | No application abuse throttling found for comments, votes or public reads. RLS and input bounds control authorization/size, not request frequency. WAF config read returned 404, so effective custom rules are unverified. | Recommend scoped distributed quotas after establishing traffic and acceptable limits. Do not install a process-local limiter or change dashboard rules blindly. |
| P1 | Hobby permits personal noncommercial use. README explicitly markets consulting services; app UI appears to be a personal HN reader without payments. | Maintainer must clarify business purpose with Vercel before relying on Hobby. README link alone does not establish a terms violation; no legal guarantee or automatic upgrade. |
| P1 | Free database recovery evidence absent; no restore drill or independent backup evidence inspected. | Document recovery prerequisites and a proposed isolated restore drill. Do not claim tested recovery or export user data during this audit. |
| P2 | `getDiscussion` uses an unbounded no-store upstream fetch; search already has a 10-second deadline. | Add matching discussion deadline and regression tests. |
| P2 | Production lacks CSP/nosniff/referrer policy; HSTS exists. No incident runbook. | Add conservative nosniff/referrer headers and practical runbook. Leave strict CSP for preview validation because nonce rendering can affect caching and OAuth/telemetry needs inventory. |
| P2 | Functions `iad1`, database US West; no explicit duration/memory configuration. | Measure before region/resource changes; do not guess a production setting. |
| P2 | Sentry replay enabled (10% sessions, 100% on error); dataCollection options left at defaults; tunnel adds function traffic. | Review privacy/redaction and quota use with real settings; avoid claiming all PII is excluded. |
| P3 | Advisor reports three unused indexes. | Retain: low traffic does not prove they are unnecessary; assess query plans before removal. |

## Complete checklist mapping

Statuses describe the baseline; changes in this PR do not imply production is fixed. P1 = address soon; P2 = next improvement; P3 = optional/low urgency. Unverified means insufficient evidence, not absent.

| Area / item | Status | Evidence / action / priority |
| --- | --- | --- |
| Operations: incident response | Missing | No runbook; add proposed procedures (P2). |
| Stage/promote/rollback knowledge | Unverified | Git previews and main deploy documented; no rollback rehearsal; runbook distinguishes proposed steps (P2). |
| Monorepo build cache | Not applicable | Single package; CI already caches npm and .next. |
| Zero downtime DNS migration | Not applicable | Only vercel.app aliases returned; no migration requested. External DNS not audited. |
| Security: CSP and headers | Missing | Homepage 200 has HSTS but no CSP/nosniff/referrer policy (P2). |
| Deployment Protection | Verified handled | API: Vercel authentication `all_except_custom_domains`; password/IP protection disabled. Public canonical homepage accessible as intended. Preview behavior still requires validation. |
| WAF rules/IP/managed rules | Unverified | Active-config endpoint 404; do not equate with no platform DDoS protection. Hobby has limited custom rules; advanced capabilities plan-dependent (P1 review). |
| Persistent log drains | Plan-dependent | API reports zero drains; Hobby excludes drains. Sentry is error telemetry, not durable full runtime logs. |
| SSL review | Verified handled | Ordinary HTTPS GET succeeded, HSTS present; no certificate-error exhaustive check. |
| Custom preview suffix | Plan-dependent | Default vercel.app aliases; optional paid branding, not a readiness blocker. |
| Lockfiles | Verified handled | package-lock.json committed; vulnerabilities separately prioritized P1. |
| Rate limiting | Missing | No app limiter found; platform controls unverified (P1). |
| Access roles | Unverified | Did not enumerate account users; confirm minimal access/MFA privately (P2). Hobby team RBAC differs from Pro. |
| SAML SSO | Plan-dependent | Paid feature, not mandatory for personal Hobby app. Deployment authentication is distinct from team SAML. |
| SCIM | Plan-dependent | Enterprise; not mandatory. |
| Audit Logs | Plan-dependent | Enterprise; ordinary activity logs are distinct. |
| Enterprise allowed cookie policy | Plan-dependent | No Enterprise policy required; ordinary auth-cookie/privacy review still applies. |
| Unwanted bots rule | Unverified | WAF read unsuccessful; consider measured abuse controls, preserve legitimate HN use (P2). |
| Reliability: Observability Plus | Plan-dependent | Paid; Sentry + base Vercel telemetry already present. End-to-end alert delivery unverified. |
| Automatic function failover | Plan-dependent | Enterprise; single region acceptable with documented outage tolerance. |
| Secure Compute passive failover | Not applicable | No Secure Compute evidence; Enterprise feature. |
| Cache headers | Verified handled | Homepage public revalidation/prerender; votes route private no-store. Next static asset defaults; personalized caching safety not exhaustively audited. |
| Cache versus ISR | Verified handled | Public search `cacheLife("minutes")` remote cache; votes private; runbook explains distinction. |
| Distributed tracing | Verified handled | Sentry server/edge/client instrumentation at 10%; actual ingestion/cross-service continuity unverified. |
| Load test | Plan-dependent | Checklist marks Enterprise; explicitly not authorized here. No load/probe traffic sent. |
| Performance: Speed Insights | Verified handled | Root layout includes component; field data/quotas unverified. |
| TTFB | Unverified | One production GET: 1.27s, not a percentile or representative benchmark (P2 field review). |
| Image optimization | Not applicable | No substantial image pipeline found; flag favicon is inline SVG. Do not add transforms for their own sake. |
| Script optimization | Verified handled | Framework bundles and vendor components; no standalone third-party script tags found in app layout. Preview hydration still to test. |
| Font optimization | Verified handled | Local system font stack; no external font request required. |
| Function/data region match | Missing | `iad1` versus US West DB (P2 measurement before change). |
| Third-party proxy | Not applicable | No proxy in returned aliases/config; external DNS unverified; no Enterprise representative needed. |
| Cost: Fluid compute | Unverified | Not returned by inspected project/deployment API; no dashboard change (P2). |
| Usage optimization | Missing | No documented quota review; add runbook (P2). Shared search cache and bounded list sizes already help. |
| Spend Management/alerts | Plan-dependent | Hobby has no Spend Management; usage caps can interrupt service. Confirm actual plan and notification settings (P2). |
| Function duration/memory | Unverified | No explicit repo configuration; inspect effective limits and workload before tuning (P2). |
| ISR intervals/on-demand | Verified handled | Public search minutes profile; no unnecessary on-demand infrastructure. Review freshness with actual users. |
| Legacy image pricing opt-in | Not applicable | No material image optimization use observed; team creation/pricing not inspected. |
| Large media to Blob | Not applicable | No large media assets found; no paid storage needed. |

## Supabase-specific follow-up

Committed migrations enable RLS and ownership policies, with pgTAP and integration coverage in CI. Hosted security advisor returned only disabled leaked-password protection; app uses GitHub OAuth, so password-specific relevance depends on whether password login is enabled in hosted Auth (unverified). [Remediation](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection). No hosted schema/data writes or row reads were performed. Advisor absence is not proof of complete authorization safety; privileged aggregate RPCs need continued regression coverage. Performance advisor: three [unused-index notices](https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index), informational only.

Privately verify hosted OAuth redirect allowlist, disabled unused providers, MFA, SSL/network restrictions, backup availability/retention, inactivity pausing, and preview database isolation. README recommends broad preview redirects and a hosted schema prebuild check; neither proves previews use an isolated database. Unmerged schema previews must not target production. No migration or credential changes in this PR.

## Validation record

Focused changes: Next.js 16.4.3, sanitize-html 2.18.1, Vitest/coverage 4.1.12, and compatible transitive patches (sharp 0.35.5, undici 7.30.1, fast-uri 3.1.9, Vite 8.3.5, Zod 4.6.7). Initial `npm audit fix` left Vitest warnings, resolved by raising both Vitest package minimums. No forced major upgrades. Final install reports zero known vulnerabilities; this does not establish absence of vulnerabilities.

Relevant Next.js advisories: [Server Actions DoS](https://github.com/advisories/GHSA-p3m5-59mp-jv5r), [SVG image optimization RCE](https://github.com/advisories/GHSA-2464-fhr4-w9xw), [typed-array cache RCE](https://github.com/advisories/GHSA-673q-mjm6-r5xr). Version matching is verified; exploitability was not tested. No image optimizer use or typed-array cache return was found.

Read current Supabase changelog markdown: upcoming TLS cipher retirement and Postgres minor-version changes deserve separate platform maintenance review; this PR changes no Supabase schema/auth APIs. No Docker binary is installed on this Mac, so database and browser OAuth E2E checks must run in existing CI. Local and final-commit CI/preview results will be reported in the draft PR. Production observations above remain baseline findings until a separately approved release.

Local verification: `npm run verify` passed lint, typecheck, 46 test files / 352 tests with 100% coverage, duplication (1.85%, under 2.5%), knip, and production build. First sandboxed attempt failed only because tooling tests could not bind localhost (EPERM); rerun with localhost access passed. `npm audit --json` reports zero findings. `git diff --check` passed. Built app on localhost returned 200 with both added headers. Placeholder database settings were used; this does not validate hosted Auth/database flows. Next.js emits a new partial-prefetching migration warning; existing cache behavior was retained rather than enabling a new mode without evaluation.

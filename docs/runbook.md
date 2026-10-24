# Operations runbook

These are proposed maintainer procedures, not a record of a completed incident drill. No on-call team, incident owner, RTO or RPO has been assigned. The maintainer should choose a reachable contact channel and acceptable downtime/data-loss targets privately before relying on this plan.

## Triage and communication

1. Record UTC time, affected feature, deployment commit, status code and a redacted reproduction. Never paste cookies, keys, OAuth codes, user bookmarks or private telemetry into public issues.
2. Check [Vercel status](https://www.vercel-status.com/), [Supabase status](https://status.supabase.com/) and Algolia availability. Check existing Vercel runtime logs, GitHub CI/migration jobs and Sentry errors for the relevant environment. Confirm alert delivery separately; installed instrumentation does not prove notifications work. Hobby runtime-log retention is short, so capture a sanitized diagnosis promptly.
3. Separate public search failures from sign-in/database failures. Use an ordinary anonymous page read; reproduce writes only locally or in an isolated preview database. Do not repeatedly retry failing mutations.
4. If the issue began with a release, compare the deployed SHA with the last known good release and its database compatibility. If data exposure is suspected, obtain authorization for containment/access changes and use a private reporting channel; public updates should disclose only impact and mitigation progress.

## Release and rollback

Normal repository behavior is tested CI, automatic branch previews, and production deployment from main. Vercel does not itself apply database migrations; the separate main-only workflow does. A schema prebuild gate may fail before migrations complete; check migration-job output before requesting a rebuild. Do not repair migration history or reset the hosted database as an outage shortcut.

Proposed release check: inspect the exact preview SHA, CI, page rendering, search, sign-in/out, private no-store responses, and isolated test-user bookmarks/comments/votes. Confirm the preview is not pointed at production before any write test. Never disable deployment protection to automate tests. Obtain authorization before production promotion/redeployment.

Proposed rollback: identify a known-good READY deployment and verify it works with the **current** schema. Review the current [Vercel rollback documentation](https://vercel.com/docs/instant-rollback) and plan availability before acting in the dashboard. Ask for explicit authorization to perform the selected production action. Reverting application code does not revert database data/migrations; prefer a reviewed forward migration for database fixes. Verify the public alias and feature health after any authorized rollback. Staging, promotion and rollback were not exercised by this audit.

## Database recovery

Free tier is not evidence of automatic recoverable backups. Privately confirm current Supabase backup/retention and inactivity-pause behavior, then define a backup process with encryption, restricted access and retention appropriate for user data. Never commit a dump or credentials. Before claiming recovery readiness, restore a backup into an isolated project, replay needed migrations, run pgTAP/integration tests and validate with disposable users. Record recovery duration and backup age. No backup export or restore was performed here.

## Quotas, performance and abuse

Review Vercel usage, Supabase usage, Sentry event/replay quotas, Speed Insights and GitHub scheduled jobs monthly and after unusual traffic. On Hobby, exceeding included usage can interrupt features; Spend Management is unavailable. Confirm the actual Vercel plan privately. Check [Hobby restrictions](https://vercel.com/docs/plans/hobby) before using this app for commercial promotion; request provider clarification if its purpose is uncertain.

Inspect p75 field TTFB/Core Web Vitals and database timings before changing region, memory or duration. Public search uses a shared minutes-profile cache; HTTP cache headers govern browser/CDN responses, while Cache Components govern server computation. Preserve private/no-store semantics for user-dependent responses; never make auth refresh/cookie responses publicly cacheable. Discussion fetches deliberately remain no-store with a ten-second upstream deadline.

For abuse, first measure which endpoint is affected. Consider the existing free WAF allowance and durable per-user/endpoint limits that also cover direct Data API writes where appropriate. Define thresholds and recovery semantics before implementation; process-local counters do not enforce global quotas across Vercel instances. Do not enable paid services, change firewall/bot rules or run load tests without authorization.

## Deferred security validation

Plan a CSP on a preview: inventory framework inline scripts, Supabase OAuth navigation, Algolia browser requests, Sentry/replay/tunnel and Vercel telemetry/toolbar. Exercise search, hydration, OAuth and mutations under the proposed policy before enforcing it. Nonces can change rendering/cache behavior; do not add broad unsafe directives merely to silence errors. The two conservative headers in this PR are not a complete CSP.

Privately review administrative MFA/access, Auth provider/redirect settings, database network/SSL controls, preview isolation and Sentry data redaction. Re-run dependency audit and Supabase advisors periodically. Unused-index notices need workload evidence before removal; password-protection advice is relevant only if password login is enabled.

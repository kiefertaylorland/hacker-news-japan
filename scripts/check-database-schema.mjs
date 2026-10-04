// Vercel deploys application code, but does not apply Supabase migrations.
// Probe the same anonymous Data API used by the app before publishing a build.
if (process.env.VERCEL === "1") {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    if (!url || !key) throw new Error("Database schema check requires NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.");
    const probes = {
      comments: [{ path: "comments?select=id,author,body,created_at&limit=0" }],
      votes: [
        { path: "votes?select=user_id,story_id&limit=0" },
        { path: "rpc/story_vote_count", body: { requested_story_id: "1" } },
      ],
    };
    for (const feature of process.argv.slice(2)) {
      if (!Object.hasOwn(probes, feature)) throw new Error(`Unknown database feature: ${feature}`);
      for (const probe of probes[feature]) {
        const response = await fetch(new URL(`/rest/v1/${probe.path}`, url), {
          method: probe.body ? "POST" : "GET",
          headers: { apikey: key, "Content-Type": "application/json" },
          ...(probe.body ? { body: JSON.stringify(probe.body) } : {}),
          signal: AbortSignal.timeout(10_000),
        });
        if (!response.ok) {
          throw new Error(`Database schema check failed for ${feature} (${probe.path.split("?")[0]}, HTTP ${response.status}). Apply the committed Supabase migrations to the deployment database and verify its Data API permissions before retrying.`);
        }
      }
    }
    console.info("Database schema check passed.");
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

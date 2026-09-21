import { Suspense } from "react";
import { Dashboard } from "@/components/dashboard/Dashboard";
import { DashboardSkeleton } from "@/components/dashboard/DashboardSkeleton";
import { AUTH_ERROR_PARAM } from "@/lib/auth/constants";
import { getCurrentUser } from "@/lib/auth/user";
import { getBookmarkIds } from "@/lib/bookmarks/queries";
import { getCachedStories } from "@/lib/search/cached";
import { readSearchParams, searchParamsFromRecord, type SearchParamsRecord } from "@/lib/search/params";

interface HomeProps {
  searchParams?: Promise<SearchParamsRecord>;
}

// The skeleton is the prerendered shell; user data and cached stories stream in.
export default function Home({ searchParams }: HomeProps) {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <HomeContent searchParams={searchParams} />
    </Suspense>
  );
}

async function HomeContent({ searchParams }: HomeProps) {
  const t0 = performance.now();
  const record = (await searchParams) ?? {};
  const search = readSearchParams(searchParamsFromRecord(record));
  const t1 = performance.now();
  const [user, initialResults] = await Promise.all([
    getCurrentUser().then((u) => { console.log("PERF user", Math.round(performance.now() - t1)); return u; }),
    getCachedStories(search).then((r) => { console.log("PERF stories", Math.round(performance.now() - t1)); return r; }).catch(() => null),
  ]);
  const t2 = performance.now();
  const savedIds = await getBookmarkIds(user?.id ?? null);
  console.log("PERF total", Math.round(performance.now() - t0), "params", Math.round(t1 - t0), "bookmarks", Math.round(performance.now() - t2));

  return (
    <Dashboard
      user={user}
      savedIds={savedIds}
      initialResults={initialResults}
      authError={record[AUTH_ERROR_PARAM] !== undefined}
    />
  );
}

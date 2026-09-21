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
  const record = (await searchParams) ?? {};
  const search = readSearchParams(searchParamsFromRecord(record));
  const [user, initialResults] = await Promise.all([
    getCurrentUser(),
    getCachedStories(search).catch(() => null),
  ]);
  // Not awaited: the grid renders as soon as stories are ready and bookmarks stream in after.
  const savedIds = user ? getBookmarkIds(user.id) : [];

  return (
    <Dashboard
      user={user}
      savedIds={savedIds}
      initialResults={initialResults}
      initialParams={search}
      authError={record[AUTH_ERROR_PARAM] !== undefined}
    />
  );
}

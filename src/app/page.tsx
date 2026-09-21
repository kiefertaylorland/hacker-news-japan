import { Suspense } from "react";
import { Dashboard } from "@/components/dashboard/Dashboard";
import { DashboardSkeleton } from "@/components/dashboard/DashboardSkeleton";
import { AUTH_ERROR_PARAM } from "@/lib/auth/constants";
import { getCurrentUser } from "@/lib/auth/user";
import { getBookmarkIds } from "@/lib/bookmarks/queries";

interface HomeProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export default async function Home({ searchParams }: HomeProps) {
  const params = (await searchParams) ?? {};
  const user = await getCurrentUser();
  const savedIds = await getBookmarkIds(user?.id ?? null);

  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <Dashboard user={user} savedIds={savedIds} authError={params[AUTH_ERROR_PARAM] !== undefined} />
    </Suspense>
  );
}

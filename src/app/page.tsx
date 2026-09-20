import { Suspense } from "react";
import { Dashboard } from "@/components/dashboard/Dashboard";
import { DashboardSkeleton } from "@/components/dashboard/DashboardSkeleton";
import { getCurrentUser } from "@/lib/auth/user";
import { getBookmarkIds } from "@/lib/bookmarks";

export default async function Home() {
  const user = await getCurrentUser();
  const savedIds = await getBookmarkIds(user?.id ?? null);

  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <Dashboard user={user} savedIds={savedIds} />
    </Suspense>
  );
}

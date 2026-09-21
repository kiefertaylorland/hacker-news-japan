import { Suspense } from "react";
import { BookmarkIcon } from "lucide-react";
import { UserMenu } from "@/components/auth/UserMenu";
import { DashboardSkeleton } from "@/components/dashboard/DashboardSkeleton";
import { EmptyState } from "@/components/layout/EmptyState";
import { SavedStories } from "@/components/saved/SavedStories";
import { getCurrentUser } from "@/lib/auth/user";
import { listBookmarks } from "@/lib/bookmarks/queries";

export const metadata = {
  title: "Saved stories · Hacker News Japan",
};

export default function SavedPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <SavedContent />
    </Suspense>
  );
}

async function SavedContent() {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <main className="min-h-screen w-full px-4 py-16">
        <EmptyState
          className="mx-auto max-w-xl"
          icon={<BookmarkIcon />}
          title="Sign in to see saved stories"
          description="Bookmarks are tied to your GitHub account."
        >
          <UserMenu user={null} next="/saved" />
        </EmptyState>
      </main>
    );
  }

  const stories = await listBookmarks(user.id);
  return <SavedStories user={user} stories={stories} />;
}

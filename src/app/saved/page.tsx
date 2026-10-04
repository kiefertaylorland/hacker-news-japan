import { Suspense } from "react";
import { BookmarkIcon } from "lucide-react";
import { SignInPrompt } from "@/components/auth/SignInPrompt";
import { DashboardSkeleton } from "@/components/dashboard/DashboardSkeleton";
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
      <SignInPrompt
        icon={<BookmarkIcon />}
        title="Sign in to see saved stories"
        description="Bookmarks are tied to your GitHub account."
        next="/saved"
      />
    );
  }

  const stories = await listBookmarks(user.id);
  return <SavedStories user={user} stories={stories} />;
}

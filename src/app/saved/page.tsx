import { Suspense } from "react";
import { BookmarkIcon } from "lucide-react";
import { SignInPrompt } from "@/components/auth/SignInPrompt";
import { PageShell } from "@/components/layout/PageShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { ErrorAlert } from "@/components/layout/ErrorAlert";
import { StoryGrid } from "@/components/stories/StoryGrid";
import { UserMenu } from "@/components/auth/UserMenu";
import { Skeleton } from "@/components/ui/skeleton";
import { SavedStories } from "@/components/saved/SavedStories";
import { getCurrentUser } from "@/lib/auth/user";
import { listBookmarks } from "@/lib/bookmarks/queries";
import { getRecommendedStories } from "@/lib/recommendations/stories";

export const metadata = {
  title: "Saved stories · Hacker News Japan",
};

export default function SavedPage() {
  return (
    <Suspense fallback={<SavedSkeleton />}>
      <SavedContent />
    </Suspense>
  );
}

function SavedSkeleton() {
  return <PageShell>
    <PageHeader eyebrow="Your reading list" title={<h1 className="text-4xl font-bold tracking-tight">Saved stories</h1>}
      description="Stories you bookmarked, newest first." actions={<Skeleton className="h-11 w-40" />} />
    <div className="min-h-6" />
    <StoryGrid stories={null} isLoading />
  </PageShell>;
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

  let stories;
  try {
    stories = await listBookmarks(user.id);
  } catch {
    return <PageShell>
      <PageHeader eyebrow="Your reading list" title={<h1 className="text-4xl font-bold tracking-tight">Saved stories</h1>}
        description="Your bookmarks are tied to your GitHub account." actions={<UserMenu user={user} next="/saved" />} />
      <ErrorAlert>Could not load saved stories. Your bookmarks have not been changed.</ErrorAlert>
      <a href="/saved" className="nav-link underline">Retry saved stories</a>
    </PageShell>;
  }
  const recommendations = await getRecommendedStories(stories).catch(() => null);
  return <SavedStories user={user} stories={stories} recommendations={recommendations} />;
}

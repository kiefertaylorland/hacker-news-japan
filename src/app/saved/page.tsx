import { BookmarkIcon } from "lucide-react";
import { UserMenu } from "@/components/auth/UserMenu";
import { SavedStories } from "@/components/saved/SavedStories";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { getCurrentUser } from "@/lib/auth/user";
import { listBookmarks } from "@/lib/bookmarks";

export const metadata = {
  title: "Saved stories · Hacker News Japan",
};

export default async function SavedPage() {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <main className="min-h-screen w-full px-4 py-16">
        <Empty className="mx-auto max-w-xl border border-dashed border-white/10 bg-white/[0.02]">
          <EmptyHeader>
            <EmptyMedia variant="icon" className="bg-white/5 text-slate-400">
              <BookmarkIcon />
            </EmptyMedia>
            <EmptyTitle className="text-slate-200">Sign in to see saved stories</EmptyTitle>
            <EmptyDescription className="text-slate-500">
              Bookmarks are tied to your GitHub account.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <UserMenu user={null} next="/saved" />
          </EmptyContent>
        </Empty>
      </main>
    );
  }

  const stories = await listBookmarks(user.id);
  return <SavedStories user={user} stories={stories} />;
}

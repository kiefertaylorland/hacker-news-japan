import Link from "next/link";
import type { ProfileComment } from "@/lib/profile/queries";
import type { HNStory } from "@/lib/types";
import { formatRelativeTime } from "@/lib/utils";
import { StoryGrid } from "@/components/stories/StoryGrid";

function EmptyList() {
  return (
    <div className="space-y-2 rounded-lg border border-border bg-card px-5 py-8">
      <p className="text-sm text-muted-foreground">Nothing here yet.</p>
      <Link href="/" className="inline-flex min-h-11 items-center text-sm text-hn hover:underline">Browse stories</Link>
    </div>
  );
}

export function ProfileStoryList({ stories }: { stories: HNStory[] }) {
  if (stories.length === 0) return <EmptyList />;
  return <StoryGrid stories={stories} isLoading={false} />;
}

export function ProfileCommentList({ comments }: { comments: ProfileComment[] }) {
  if (comments.length === 0) return <EmptyList />;
  return (
    <ul className="divide-y divide-border rounded-lg border border-border bg-card">
      {comments.map((comment) => (
        <li key={comment.id} className="space-y-3 p-5">
          <div className="flex flex-wrap gap-x-1 text-xs leading-6 text-muted-foreground">
            <span>{comment.author}</span>{" · "}
            <span suppressHydrationWarning>{formatRelativeTime(comment.created_at)}</span>{" · on: "}
            <Link href={`/stories/${comment.story_id}`} className="text-hn hover:underline">discussion</Link>
          </div>
          <p className="whitespace-pre-wrap wrap-break-word text-sm leading-7">{comment.body}</p>
        </li>
      ))}
    </ul>
  );
}

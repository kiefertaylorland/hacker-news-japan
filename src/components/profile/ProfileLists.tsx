import Link from "next/link";
import type { ProfileComment } from "@/lib/profile/queries";
import type { HNStory } from "@/lib/types";
import { getDomain, getStoryUrl, hnItemUrl } from "@/lib/url";
import { formatRelativeTime } from "@/lib/utils";

function EmptyList() {
  return <p className="text-sm text-slate-500">Nothing here yet.</p>;
}

/** Numbered story rows in the style of HN's upvoted and favorites pages. */
export function ProfileStoryList({ stories }: { stories: HNStory[] }) {
  if (stories.length === 0) return <EmptyList />;
  return (
    <ol className="list-decimal space-y-3 pl-6 text-sm marker:text-slate-500">
      {stories.map((story) => {
        const domain = getDomain(story.url);
        return (
          <li key={story.objectID}>
            <a href={getStoryUrl(story.url, hnItemUrl(story.objectID))} target="_blank" rel="noopener noreferrer" className="text-slate-100 hover:text-hn">
              {story.title}
            </a>
            {domain && <span className="text-xs text-slate-500"> ({domain})</span>}
            <div className="text-xs text-slate-500">
              {story.points ?? 0} points by {story.author}{" | "}
              <span suppressHydrationWarning>{formatRelativeTime(story.created_at)}</span>{" | "}
              <Link href={`/stories/${story.objectID}`} className="hover:text-hn hover:underline">{story.num_comments ?? 0} comments</Link>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export function ProfileCommentList({ comments }: { comments: ProfileComment[] }) {
  if (comments.length === 0) return <EmptyList />;
  return (
    <ul className="space-y-5">
      {comments.map((comment) => (
        <li key={comment.id} className="border-l border-slate-700 pl-4">
          <div className="text-xs text-slate-500">
            <span>{comment.author}</span>{" · "}
            <span suppressHydrationWarning>{formatRelativeTime(comment.created_at)}</span>{" · on: "}
            <Link href={`/stories/${comment.story_id}`} className="hover:text-hn hover:underline">discussion</Link>
          </div>
          <p className="whitespace-pre-wrap wrap-break-word text-sm">{comment.body}</p>
        </li>
      ))}
    </ul>
  );
}

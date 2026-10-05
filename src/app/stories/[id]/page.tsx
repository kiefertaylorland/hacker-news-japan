import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/user";
import { getDiscussion } from "@/lib/comments/algolia";
import { listComments } from "@/lib/comments/queries";
import { listCommentReactions } from "@/lib/comments/reactions";
import { formatRelativeTime } from "@/lib/utils";
import { CommentThread } from "@/components/comments/CommentThread";
import { CommentForm } from "@/components/comments/CommentForm";
import { CommentReactions } from "@/components/comments/CommentReactions";
import { UserMenu } from "@/components/auth/UserMenu";
import { PageShell } from "@/components/layout/PageShell";
import { ErrorAlert } from "@/components/layout/ErrorAlert";

interface Props { params: Promise<{ id: string }> }
export default function DiscussionPage({ params }: Props) {
  return <Suspense fallback={<p role="status">Loading discussion…</p>}><DiscussionContent params={params} /></Suspense>;
}

async function DiscussionContent({ params }: Props) {
  const { id } = await params;
  let result, reactions;
  try {
    result = await Promise.all([getDiscussion(id), listComments(id), getCurrentUser()]);
    reactions = await listCommentReactions(result[2]?.id ?? null, result[1].map((comment) => comment.id));
  } catch {
    return <PageShell><ErrorAlert>Could not load discussion. Please try again.</ErrorAlert><Link href={`/stories/${encodeURIComponent(id)}`}>Retry</Link></PageShell>;
  }
  const [story, localComments, user] = result;
  if (!story) notFound();
  return (
    <PageShell>
      <Link href="/" className="text-sm text-hn">Back to search</Link>
      <h1 className="my-5 text-2xl font-semibold">{story.title}</h1>
      <UserMenu user={user} next={`/stories/${id}`} />
      <h2 className="my-5 text-lg font-semibold">Comments</h2>
      <p className="mb-4 text-sm text-slate-400">Comments posted here are shared on Hacker News Japan.</p>
      {user ? <CommentForm storyId={id} /> : <p className="mb-5">Sign in to leave a comment.</p>}
      {localComments.length === 0 && story.children.length === 0 && <p>No comments yet.</p>}
      <ul className="mb-6 space-y-5">
        {localComments.map((comment) => (
          <li key={comment.id} className="border-l border-slate-700 pl-4">
            <div className="text-xs text-slate-500"><span>{comment.author}</span>{" · "}<span suppressHydrationWarning>{formatRelativeTime(comment.created_at)}</span>{" · Hacker News Japan"}
              {user && <>{" · "}<CommentReactions commentId={comment.id} upvoted={reactions.upvoted.includes(comment.id)} favorited={reactions.favorited.includes(comment.id)} /></>}
            </div>
            <p className="whitespace-pre-wrap wrap-break-word text-sm">{comment.body}</p>
          </li>
        ))}
      </ul>
      <CommentThread comments={story.children} />
    </PageShell>
  );
}

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
import { PageHeader } from "@/components/layout/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";

interface Props { params: Promise<{ id: string }> }
export default function DiscussionPage({ params }: Props) {
  return (
    <Suspense fallback={<PageShell><div role="status" className="mx-auto max-w-3xl space-y-5"><span className="sr-only">Loading discussion…</span><Skeleton className="h-24 w-full" /><Skeleton className="h-48 w-full" /></div></PageShell>}>
      <DiscussionContent params={params} />
    </Suspense>
  );
}

async function DiscussionContent({ params }: Props) {
  const { id } = await params;
  let result, reactions;
  try {
    result = await Promise.all([getDiscussion(id), listComments(id), getCurrentUser()]);
    reactions = await listCommentReactions(result[2]?.id ?? null, result[1].map((comment) => comment.id));
  } catch {
    return <PageShell><h1 className="text-3xl font-semibold">Discussion unavailable</h1><ErrorAlert>Could not load discussion. Please try again.</ErrorAlert><a href={`/stories/${encodeURIComponent(id)}`} className="inline-flex min-h-11 items-center text-hn hover:underline">Retry</a></PageShell>;
  }
  const [story, localComments, user] = result;
  if (!story) notFound();
  return (
    <PageShell>
      <PageHeader
        eyebrow={<Link href="/" className="inline-flex min-h-11 items-center text-sm text-hn hover:underline">Back to search</Link>}
        title={<h1 className="max-w-3xl wrap-break-word text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">{story.title}</h1>}
        description="Discussion from Hacker News and the Hacker News Japan community."
        actions={<UserMenu user={user} next={`/stories/${id}`} />}
      />
      <section aria-labelledby="comments-heading" className="mx-auto w-full max-w-3xl space-y-5">
      <h2 id="comments-heading" className="text-xl font-semibold">Comments</h2>
      <p className="mb-4 text-sm text-muted-foreground">Comments posted here are shared on Hacker News Japan.</p>
      {user ? <CommentForm storyId={id} /> : <p className="mb-5">Sign in to leave a comment.</p>}
      {localComments.length === 0 && story.children.length === 0 && <p>No comments yet.</p>}
      <ul className="space-y-5">
        {localComments.map((comment) => (
          <li key={comment.id} className="space-y-3 border-l-2 border-border pl-4">
            <div className="text-xs text-muted-foreground"><span>{comment.author}</span>{" · "}<span suppressHydrationWarning>{formatRelativeTime(comment.created_at)}</span>{" · Hacker News Japan"}
              {user && <>{" · "}<CommentReactions commentId={comment.id} upvoted={reactions.upvoted.includes(comment.id)} favorited={reactions.favorited.includes(comment.id)} /></>}
            </div>
            <p className="whitespace-pre-wrap wrap-break-word text-sm leading-7">{comment.body}</p>
          </li>
        ))}
      </ul>
      <CommentThread comments={story.children} />
      </section>
    </PageShell>
  );
}

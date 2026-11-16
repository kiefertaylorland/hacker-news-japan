import sanitizeHtml from "sanitize-html";
import type { HNComment } from "@/lib/comments/algolia";
import { formatRelativeTime } from "@/lib/utils";

export function CommentThread({ comments }: { comments: HNComment[] }) {
  return (
    <ul className="comment-thread min-w-0 space-y-5 empty:hidden">
      {comments.map((comment) => (
        <li key={comment.id} id={`comment-${comment.id}`} className="border-l border-slate-700 pl-4">
          <div className="mb-1 text-xs text-muted-foreground">
            <span>{comment.author ?? "[deleted]"}</span>{" · "}
            <span suppressHydrationWarning>{formatRelativeTime(comment.created_at)}</span>
          </div>
          <div className="reading-surface text-sm text-slate-200 [&_p]:mb-3 [&_a]:underline [&_a]:underline-offset-4 [&_pre]:max-w-full [&_pre]:overflow-x-auto [&_pre]:whitespace-pre [&_pre]:rounded-md [&_pre]:bg-background [&_pre]:p-3"
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(comment.text ?? "[deleted]", {
              allowedTags: ["p", "a", "i", "em", "b", "strong", "pre", "code", "br"],
              allowedAttributes: { a: ["href", "rel"] },
              allowedSchemes: ["http", "https"],
              allowProtocolRelative: false,
            }) }} />
          <CommentThread comments={comment.children} />
        </li>
      ))}
    </ul>
  );
}

import sanitizeHtml from "sanitize-html";
import type { HNComment } from "@/lib/comments/algolia";
import { formatRelativeTime } from "@/lib/utils";

export function CommentThread({ comments }: { comments: HNComment[] }) {
  return (
    <ul className="space-y-5">
      {comments.map((comment) => (
        <li key={comment.id} id={`comment-${comment.id}`} className="border-l border-slate-700 pl-4">
          <div className="mb-1 text-xs text-slate-500">
            <span>{comment.author ?? "[deleted]"}</span>{" · "}
            <span suppressHydrationWarning>{formatRelativeTime(comment.created_at)}</span>
          </div>
          <div className="break-words text-sm text-slate-200 [&_p]:mb-3 [&_a]:underline [&_pre]:overflow-x-auto"
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

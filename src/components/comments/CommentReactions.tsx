"use client";

import { useState, useTransition } from "react";
import { ChevronUpIcon } from "lucide-react";
import { setCommentFavorite, upvoteComment } from "@/lib/comments/reaction-actions";
import { cn } from "@/lib/utils";

interface Reactions { upvoted: boolean; favorited: boolean }

export function CommentReactions({ commentId, ...initial }: Reactions & { commentId: string }) {
  const [reactions, setReactions] = useState(initial);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();
  const save = (action: () => Promise<{ error?: string }>, next: Partial<Reactions>) => {
    setError(undefined);
    startTransition(async () => {
      try {
        const result = await action();
        if (result.error) setError(result.error);
        else setReactions((current) => ({ ...current, ...next }));
      } catch { setError("Could not update. Please try again."); }
    });
  };
  return (
    <span className="inline-flex items-center gap-2">
      <button type="button" aria-label={reactions.upvoted ? "Upvoted comment" : "Upvote comment"} aria-pressed={reactions.upvoted}
        disabled={pending || reactions.upvoted}
        className={cn("rounded focus-visible:ring-2 focus-visible:ring-hn", reactions.upvoted ? "text-hn" : "text-slate-400 hover:text-hn")}
        onClick={() => save(() => upvoteComment(commentId), { upvoted: true })}>
        <ChevronUpIcon className="h-3.5 w-3.5" />
      </button>
      <button type="button" aria-pressed={reactions.favorited} disabled={pending} className="hover:text-hn hover:underline"
        onClick={() => save(() => setCommentFavorite(commentId, !reactions.favorited), { favorited: !reactions.favorited })}>
        {reactions.favorited ? "un-favorite" : "favorite"}
      </button>
      {error && <span role="alert" className="text-red-400">{error}</span>}
    </span>
  );
}

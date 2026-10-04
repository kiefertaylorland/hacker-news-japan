"use client";

import { useState, useTransition } from "react";
import { postComment } from "@/lib/comments/actions";
import { Button } from "@/components/ui/button";

export function CommentForm({ storyId }: { storyId: string }) {
  const [body, setBody] = useState("");
  const [error, setError] = useState<string>();
  const [posted, setPosted] = useState(false);
  const [pending, startTransition] = useTransition();
  return (
    <form className="mb-8 space-y-3" onSubmit={(event) => {
      event.preventDefault();
      setError(undefined);
      setPosted(false);
      startTransition(async () => {
        try {
          const result = await postComment(storyId, body);
          if (result.error) setError(result.error);
          else { setBody(""); setPosted(true); }
        } catch { setError("Could not post comment. Please try again."); }
      });
    }}>
      <label htmlFor="comment-body" className="block text-sm">Comment</label>
      <textarea id="comment-body" required maxLength={10000} rows={5} value={body}
        disabled={pending} onChange={(event) => setBody(event.target.value)}
        className="w-full rounded border border-slate-700 bg-card p-3 text-sm" />
      <Button type="submit" disabled={pending || !body.trim()}>{pending ? "Posting…" : "Add comment"}</Button>
      {error && <p role="alert">{error}</p>}
      {posted && <p role="status">Comment posted.</p>}
    </form>
  );
}

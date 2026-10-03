"use client";

import { useEffect, useState, useTransition } from "react";
import { TrendingUpIcon } from "lucide-react";
import { upvote } from "@/lib/votes/actions";
import { loadVote } from "@/lib/votes/client";
import { cn } from "@/lib/utils";

export function VoteButton({ storyId, points }: { storyId: string; points: number | null }) {
  const [vote, setVote] = useState({ count: 0, voted: false });
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();
  useEffect(() => {
    let active = true;
    loadVote(storyId).then((result) => { if (active) { setVote(result); setLoaded(true); } })
      .catch(() => { if (active) setError("Could not load votes."); });
    return () => { active = false; };
  }, [storyId]);
  return (
    <div>
      <button type="button" aria-label={vote.voted ? "Upvoted" : "Upvote"} aria-pressed={vote.voted}
        disabled={!loaded || pending || vote.voted}
        className={cn("flex items-center gap-1.5 rounded focus-visible:ring-2 focus-visible:ring-hn", vote.voted ? "text-hn" : "text-slate-400 hover:text-hn")}
        onClick={() => {
          setError(undefined);
          startTransition(async () => {
            try {
              const result = await upvote(storyId);
              if (result.error) setError(result.error);
              else setVote({ count: vote.count + 1, voted: true });
            } catch { setError("Could not upvote. Please try again."); }
          });
        }}>
        <TrendingUpIcon className="h-3.5 w-3.5" />
        <span className="font-medium tabular-nums">{(points ?? 0) + vote.count}</span>
      </button>
      {error && <span role="alert" className="text-xs text-red-400">{error}</span>}
    </div>
  );
}

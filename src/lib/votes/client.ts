import type { VoteState } from "./actions";

type Pending = { resolve: (vote: VoteState) => void; reject: (error: Error) => void };
let queue: Map<string, Pending[]> | undefined;

/** Coalesces every card's request from the same render into one GET, avoiding an N+1 per story list. */
export function loadVote(storyId: string): Promise<VoteState> {
  return new Promise((resolve, reject) => {
    if (!queue) {
      const batch = new Map<string, Pending[]>();
      queue = batch; queueMicrotask(() => { queue = undefined; void flush(batch); });
    }
    queue.set(storyId, [...(queue.get(storyId) ?? []), { resolve, reject }]);
  });
}

async function flush(batch: Map<string, Pending[]>) {
  try {
    const response = await fetch(`/api/votes?ids=${[...batch.keys()].map(encodeURIComponent).join(",")}`, { cache: "no-store" });
    if (!response.ok) throw new Error("Could not load votes");
    const votes: Record<string, VoteState> = await response.json();
    batch.forEach((pending, id) => pending.forEach((p) => p.resolve(votes[id])));
  } catch {
    batch.forEach((pending) => pending.forEach((p) => p.reject(new Error("Could not load votes"))));
  }
}

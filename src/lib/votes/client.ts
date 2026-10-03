export async function loadVote(storyId: string): Promise<{ count: number; voted: boolean }> {
  const response = await fetch(`/api/votes/${encodeURIComponent(storyId)}`, { cache: "no-store" });
  if (!response.ok) throw new Error("Could not load votes");
  return response.json();
}

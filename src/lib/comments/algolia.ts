export interface HNComment {
  id: number;
  author: string | null;
  created_at: string;
  text: string | null;
  children: HNComment[];
}
export interface Discussion {
  id: number;
  type: string;
  title: string;
  children: HNComment[];
}

export function validateStoryId(id: string): void {
  if (!/^[1-9]\d*$/.test(id)) throw new Error("Invalid story id");
}

export async function getDiscussion(id: string): Promise<Discussion | null> {
  validateStoryId(id);
  const response = await fetch(`https://hn.algolia.com/api/v1/items/${id}`, { cache: "no-store" });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Could not load discussion: ${response.status}`);
  const item = await response.json() as Discussion;
  return item.type === "story" ? item : null;
}

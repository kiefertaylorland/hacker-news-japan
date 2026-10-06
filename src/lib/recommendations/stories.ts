import { getCachedStories } from "@/lib/search/cached";
import type { HNStory } from "@/lib/types";

// Common title words and the site's Japan scope are not useful personal interests.
const STOP_WORDS = new Set(
  "about after also an and are as ask at be been before being but by can do for from have he hn how if in into is it its japan japanese me my new no not now of on or our show so than that the their them then there these they this through to up us was we were what when where which who why will with you your".split(" ")
);

function titleTopics(title: string): string[] {
  // Bookmark titles can be supplied by clients; bound processing and query length.
  return [...new Set(title.slice(0, 300).toLowerCase().split(/[^\p{L}\p{N}]+/u))]
    .filter((word) => word.length >= 2 && !STOP_WORDS.has(word) && !/^\d+$/.test(word));
}

/** Saved stories arrive newest bookmark first. Only public topic searches are cached;
 * this user's interest weights and excluded bookmark IDs remain request-local. */
export async function getRecommendedStories(savedStories: HNStory[]): Promise<HNStory[]> {
  const interests = new Map<string, number>();
  for (const story of savedStories.slice(0, 20)) {
    for (const topic of titleTopics(story.title)) {
      interests.set(topic, (interests.get(topic) ?? 0) + 1);
    }
  }

  const topics = [...interests.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([topic]) => topic);
  const searches = await Promise.allSettled(topics.map((query) => getCachedStories({
    query,
    storyType: "story",
    dateRange: "all",
    sortBy: "relevance",
    page: 0,
  })));
  const results = searches.flatMap((result) => result.status === "fulfilled" ? [result.value] : []);
  if (searches.length > 0 && results.length === 0) {
    throw new Error("Could not load recommendations");
  }
  const savedIds = new Set(savedStories.map((story) => story.objectID));
  const candidates = new Map<string, { story: HNStory; score: number }>();
  for (const story of results.flatMap((result) => result.hits)) {
    if (savedIds.has(story.objectID)) continue;
    const score = titleTopics(story.title)
      .reduce((total, topic) => total + (interests.get(topic) ?? 0), 0);
    if (score > 0) candidates.set(story.objectID, { story, score });
  }

  return [...candidates.values()]
    .sort((a, b) => b.score - a.score || b.story.created_at_i - a.story.created_at_i)
    .slice(0, 12)
    .map(({ story }) => story);
}

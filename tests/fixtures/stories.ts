import type { BookmarkRow } from "@/lib/bookmarks/queries";
import type { AlgoliaResponse, HNStory } from "@/lib/types";

export function makeStory(overrides: Partial<HNStory> = {}): HNStory {
  return {
    objectID: "123",
    title: "Building in Japan",
    url: "https://www.example.com/post",
    author: "alice",
    points: 42,
    num_comments: 7,
    created_at: "1970-01-01T00:00:10.000Z",
    created_at_i: 10,
    _tags: ["story"],
    story_id: 123,
    ...overrides,
  };
}

export const sampleStory = makeStory();

export const sampleBookmarkRow: BookmarkRow = {
  user_id: "user-1",
  object_id: "123",
  title: "Building in Japan",
  url: "https://www.example.com/post",
  author: "alice",
  points: 42,
  num_comments: 7,
  created_at_i: 10,
  tags: ["story"],
};

export function makeResults(overrides: Partial<AlgoliaResponse> = {}): AlgoliaResponse {
  return {
    hits: [sampleStory],
    nbHits: 1,
    nbPages: 3,
    page: 0,
    hitsPerPage: 30,
    query: "Japan",
    ...overrides,
  };
}

export const sampleResults = makeResults();

export const authUser = { id: "user-1", name: "octocat", avatarUrl: null };

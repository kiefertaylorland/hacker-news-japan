import { cacheLife } from "next/cache";
import { searchStories } from "./api";
import type { AlgoliaResponse, SearchParams } from "../types";

/**
 * Server-side story fetch shared by every visitor with the same search params.
 * Errors propagate so a failed Algolia call is never cached.
 */
export async function getCachedStories(params: SearchParams): Promise<AlgoliaResponse> {
  "use cache";
  cacheLife("minutes");
  return searchStories(params);
}

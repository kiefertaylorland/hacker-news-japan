const HN_ITEM_BASE = "https://news.ycombinator.com/item?id=";

export function hnItemUrl(objectID: string): string {
  return `${HN_ITEM_BASE}${objectID}`;
}

/** Bare hostname without a leading www., or "" when the url is missing or invalid. */
export function getDomain(url: string | null): string {
  if (!url) return "";
  try {
    return new URL(url).hostname.replace("www.", "");
  } catch {
    return "";
  }
}

/** The story's own link when it is a well-formed http(s) url, otherwise the fallback. */
export function getStoryUrl(url: string | null, fallbackUrl: string): string {
  if (!url) return fallbackUrl;
  try {
    const { protocol } = new URL(url);
    return protocol === "http:" || protocol === "https:" ? url : fallbackUrl;
  } catch {
    return fallbackUrl;
  }
}

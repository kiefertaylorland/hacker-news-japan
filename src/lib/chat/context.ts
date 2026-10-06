import sanitizeHtml from "sanitize-html";
import { getDiscussion } from "@/lib/comments/algolia";
import { getStoryUrl, hnItemUrl } from "@/lib/url";

function plainText(text: string | null | undefined): string {
  return sanitizeHtml(text ?? "", {
    allowedTags: [],
    allowedAttributes: {},
  }).slice(0, 2000);
}

export async function getArticleContext(storyId: string, signal?: AbortSignal) {
  const story = await getDiscussion(storyId, signal);
  if (!story) return null;
  return {
    id: storyId,
    title: story.title.slice(0, 500),
    url: getStoryUrl(story.url ?? null, hnItemUrl(storyId)),
    discussionUrl: hnItemUrl(storyId),
    text: plainText(story.text),
    comments: story.children
      .slice(0, 12)
      .map((comment) => plainText(comment.text)),
  };
}

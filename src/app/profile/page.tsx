import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { UserIcon } from "lucide-react";
import { SignInPrompt } from "@/components/auth/SignInPrompt";
import { UserMenu } from "@/components/auth/UserMenu";
import { ErrorAlert } from "@/components/layout/ErrorAlert";
import { PageShell } from "@/components/layout/PageShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { ProfileCommentList, ProfileStoryList } from "@/components/profile/ProfileLists";
import { getCurrentUser } from "@/lib/auth/user";
import { listBookmarks } from "@/lib/bookmarks/queries";
import { getAccountCreatedAt, listFavoriteComments, listUpvotedComments, listUpvotedStories } from "@/lib/profile/queries";

export const metadata = {
  title: "Profile · Hacker News Japan",
};

// Favorite submissions are the user's bookmarks.
const VIEWS = {
  "upvoted-submissions": { title: "Upvoted submissions", load: async (userId: string) => <ProfileStoryList stories={await listUpvotedStories(userId)} /> },
  "upvoted-comments": { title: "Upvoted comments", load: async (userId: string) => <ProfileCommentList comments={await listUpvotedComments(userId)} /> },
  "favorite-submissions": { title: "Favorite submissions", load: async (userId: string) => <ProfileStoryList stories={await listBookmarks(userId)} /> },
  "favorite-comments": { title: "Favorite comments", load: async (userId: string) => <ProfileCommentList comments={await listFavoriteComments(userId)} /> },
};
type View = keyof typeof VIEWS;

interface Props { searchParams: Promise<{ view?: string | string[] }> }

export default function ProfilePage({ searchParams }: Props) {
  return (
    <Suspense fallback={<PageShell><div role="status" className="space-y-5"><span className="sr-only">Loading profile…</span><Skeleton className="h-24 w-full" /><Skeleton className="h-40 w-full" /></div></PageShell>}>
      <ProfileContent searchParams={searchParams} />
    </Suspense>
  );
}

async function ProfileContent({ searchParams }: Props) {
  const [user, { view: requested }] = await Promise.all([getCurrentUser(), searchParams]);
  if (!user) {
    return <SignInPrompt icon={<UserIcon />} title="Sign in to see your profile" description="Your profile is tied to your GitHub account." next="/profile" />;
  }
  const view = Object.keys(VIEWS).find((key): key is View => key === requested) ?? null;
  let createdAt, list;
  try {
    [createdAt, list] = await Promise.all([getAccountCreatedAt(), view && VIEWS[view].load(user.id)]);
  } catch {
    const href = view ? `/profile?view=${view}` : "/profile";
    return <PageShell><h1 className="text-3xl font-semibold">Profile unavailable</h1><ErrorAlert>Could not load your profile. Please try again.</ErrorAlert><a href={href} className="inline-flex min-h-11 items-center text-hn hover:underline">Retry</a></PageShell>;
  }
  const viewLink = (target: View, label: string) => (
    <Link href={`/profile?view=${target}`} aria-current={view === target ? "page" : undefined}
      className="inline-flex min-h-11 items-center rounded px-2 underline-offset-4 hover:bg-accent hover:text-hn hover:underline aria-[current=page]:bg-accent aria-[current=page]:text-hn">{label}</Link>
  );
  const row = (label: string, value: ReactNode) => (
    <tr><th scope="row" className="w-20 pr-4 text-left align-top font-normal text-muted-foreground">{label}</th><td className="min-w-0 [overflow-wrap:anywhere]">{value}</td></tr>
  );
  return (
    <PageShell>
      <PageHeader
        eyebrow={<Link href="/" className="inline-flex min-h-11 items-center text-sm text-hn hover:underline">Back to search</Link>}
        title={<h1 className="text-3xl font-semibold tracking-tight">Profile</h1>}
        description="Your account and private reading activity."
        actions={<UserMenu user={user} next="/profile" />}
      />
      <table aria-label="Profile" className="w-full max-w-2xl table-fixed border-separate border-spacing-y-2 rounded-lg border border-border bg-card p-4 text-sm sm:p-6">
        <tbody>
          {row("user:", user.name)}
          {row("created:", <time dateTime={createdAt}>{new Date(createdAt).toLocaleString("en-US", { dateStyle: "long", timeStyle: "long", timeZone: "UTC" })}</time>)}
          {row("", <>{viewLink("upvoted-submissions", "upvoted submissions")} / {viewLink("upvoted-comments", "comments")} <span className="text-muted-foreground">(private)</span></>)}
          {row("", <>{viewLink("favorite-submissions", "favorite submissions")} / {viewLink("favorite-comments", "comments")} <span className="text-muted-foreground">(private)</span></>)}
        </tbody>
      </table>
      {view && (
        <section aria-label="Reading activity" className="space-y-4">
          <h2 className="text-lg font-semibold">{VIEWS[view].title}</h2>
          {list}
        </section>
      )}
    </PageShell>
  );
}

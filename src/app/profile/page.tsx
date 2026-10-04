import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { UserIcon } from "lucide-react";
import { SignInPrompt } from "@/components/auth/SignInPrompt";
import { UserMenu } from "@/components/auth/UserMenu";
import { ErrorAlert } from "@/components/layout/ErrorAlert";
import { PageShell } from "@/components/layout/PageShell";
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
  return <Suspense fallback={<p role="status">Loading profile…</p>}><ProfileContent searchParams={searchParams} /></Suspense>;
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
    return <PageShell><ErrorAlert>Could not load your profile. Please try again.</ErrorAlert><Link href={href}>Retry</Link></PageShell>;
  }
  const viewLink = (target: View, label: string) => (
    <Link href={`/profile?view=${target}`} aria-current={view === target ? "page" : undefined}
      className="underline-offset-2 hover:text-hn hover:underline aria-[current=page]:text-hn">{label}</Link>
  );
  const row = (label: string, value: ReactNode) => (
    <tr><th scope="row" className="pr-4 text-left align-top font-normal text-slate-500">{label}</th><td>{value}</td></tr>
  );
  return (
    <PageShell>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Link href="/" className="text-sm text-hn">Back to search</Link>
        <UserMenu user={user} next="/profile" />
      </div>
      <h1 className="text-2xl font-semibold">Profile</h1>
      <table aria-label="Profile" className="text-sm">
        <tbody>
          {row("user:", user.name)}
          {row("created:", <time dateTime={createdAt}>{new Date(createdAt).toLocaleString("en-US", { dateStyle: "long", timeStyle: "long", timeZone: "UTC" })}</time>)}
          {row("", <>{viewLink("upvoted-submissions", "upvoted submissions")} / {viewLink("upvoted-comments", "comments")} <span className="text-slate-500">(private)</span></>)}
          {row("", <>{viewLink("favorite-submissions", "favorite submissions")} / {viewLink("favorite-comments", "comments")} <span className="text-slate-500">(private)</span></>)}
        </tbody>
      </table>
      {view && (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">{VIEWS[view].title}</h2>
          {list}
        </section>
      )}
    </PageShell>
  );
}

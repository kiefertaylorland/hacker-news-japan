"use client";

import Link from "next/link";
import { useFormStatus } from "react-dom";
import { GithubIcon, LoaderCircleIcon, LogOutIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AuthUser } from "@/lib/auth/user";
import { signInWithGitHub, signOut } from "@/app/auth/actions";

interface UserMenuProps {
  user: AuthUser | null;
  next?: string;
}

function SignInButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="outline" size="sm" disabled={pending} aria-busy={pending}
      className="min-h-11 border-border bg-card text-foreground hover:bg-accent">
      <GithubIcon aria-hidden="true" />
      {pending ? "Connecting to GitHub…" : "Sign in with GitHub"}
    </Button>
  );
}

function SignOutButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="ghost" size="sm" disabled={pending} aria-busy={pending}
      aria-label={pending ? "Signing out…" : "Sign out"}
      className="min-h-11 min-w-11 text-muted-foreground hover:bg-accent hover:text-foreground">
      {pending ? <LoaderCircleIcon aria-hidden="true" className="animate-spin" /> : <LogOutIcon aria-hidden="true" />}
    </Button>
  );
}

export function UserMenu({ user, next = "/" }: UserMenuProps) {
  if (!user) {
    return (
      <form action={signInWithGitHub}>
        <input type="hidden" name="next" value={next} />
        <SignInButton />
      </form>
    );
  }

  return (
    <div className="flex max-w-full flex-wrap items-center gap-2 text-sm">
      {user.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={user.avatarUrl} alt="" width={28} height={28}
          className="h-7 w-7 rounded-full border border-border" />
      ) : null}
      <Link href="/profile" className="flex min-h-11 max-w-36 items-center truncate text-foreground hover:underline">{user.name}</Link>
      <form action={signOut}><SignOutButton /></form>
    </div>
  );
}

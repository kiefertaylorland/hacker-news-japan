"use client";

import Link from "next/link";
import { BookmarkIcon, GithubIcon, LogOutIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AuthUser } from "@/lib/auth/user";
import { signInWithGitHub, signOut } from "@/app/auth/actions";

interface UserMenuProps {
  user: AuthUser | null;
  next?: string;
}

export function UserMenu({ user, next = "/" }: UserMenuProps) {
  if (!user) {
    return (
      <form action={signInWithGitHub}>
        <input type="hidden" name="next" value={next} />
        <Button
          type="submit"
          variant="outline"
          size="sm"
          className="border-white/15 bg-white/5 text-slate-200 hover:bg-white/10 hover:text-white"
        >
          <GithubIcon />
          Sign in with GitHub
        </Button>
      </form>
    );
  }

  return (
    <div className="flex items-center gap-2 text-sm">
      {user.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={user.avatarUrl}
          alt=""
          width={28}
          height={28}
          className="h-7 w-7 rounded-full border border-white/15"
        />
      ) : null}
      <span className="max-w-[10rem] truncate text-slate-300">{user.name}</span>
      <Button
        asChild
        variant="ghost"
        size="sm"
        className="text-slate-300 hover:bg-white/10 hover:text-white"
      >
        <Link href="/saved">
          <BookmarkIcon />
          Saved
        </Link>
      </Button>
      <form action={signOut}>
        <Button
          type="submit"
          variant="ghost"
          size="sm"
          aria-label="Sign out"
          className="text-slate-400 hover:bg-white/10 hover:text-white"
        >
          <LogOutIcon />
        </Button>
      </form>
    </div>
  );
}

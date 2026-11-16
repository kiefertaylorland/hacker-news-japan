import type { ReactNode } from "react";
import Link from "next/link";
import { NetworkStatus } from "./NetworkStatus";

/** Full-height page wrapper with the shared max-width container and vertical rhythm. */
export function PageShell({ children, activePage }: { children: ReactNode; activePage?: string }) {
  return (
    <div className="min-h-screen">
      <a href="#main-content" className="skip-link">Skip to content</a>
      <div className="site-masthead">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-8 gap-y-2 px-4 py-3 sm:px-6">
          <Link href="/" className="inline-flex min-h-11 items-center gap-3 font-semibold tracking-tight">
            <span aria-hidden="true" className="font-serif text-2xl text-hn">日本</span>
            <span>Hacker News Japan</span>
          </Link>
          <nav aria-label="Main navigation" className="flex flex-wrap gap-1 text-sm">
            <Link className="nav-link" href="/" aria-current={activePage === "/" ? "page" : undefined}>Search</Link>
            <Link className="nav-link" href="/saved" aria-current={activePage === "/saved" ? "page" : undefined}>Saved</Link>
            <Link className="nav-link" href="/profile" aria-current={activePage === "/profile" ? "page" : undefined}>Profile</Link>
          </nav>
        </div>
      </div>
      <main id="main-content" tabIndex={-1} className="mx-auto w-full max-w-5xl space-y-6 px-4 py-6 sm:space-y-8 sm:px-6 sm:py-10">
        <NetworkStatus />
        {children}
      </main>
    </div>
  );
}

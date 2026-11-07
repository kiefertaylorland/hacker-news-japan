import type { ReactNode } from "react";

/** Full-height page wrapper with the shared max-width container and vertical rhythm. */
export function PageShell({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen w-full px-4 py-5 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
      <div className="mx-auto max-w-7xl space-y-7 sm:space-y-8">{children}</div>
    </main>
  );
}

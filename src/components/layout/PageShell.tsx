import type { ReactNode } from "react";

/** Full-height page wrapper with the shared max-width container and vertical rhythm. */
export function PageShell({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen w-full py-6 px-4 sm:py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">{children}</div>
    </main>
  );
}

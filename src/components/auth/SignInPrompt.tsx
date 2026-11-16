import Link from "next/link";
import type { ReactNode } from "react";
import { UserMenu } from "@/components/auth/UserMenu";
import { EmptyState } from "@/components/layout/EmptyState";
import { PageShell } from "@/components/layout/PageShell";

interface SignInPromptProps {
  icon: ReactNode;
  title: string;
  description: string;
  next: string;
}

/** Keep signed-out visitors oriented while offering the protected action. */
export function SignInPrompt({ icon, title, description, next }: SignInPromptProps) {
  return (
    <PageShell activePage={next}>
      <EmptyState className="mx-auto max-w-xl" icon={icon} title={title} description={description}>
        <UserMenu user={null} next={next} />
        <Link href="/" className="inline-flex min-h-11 items-center text-sm text-hn hover:underline">Browse stories</Link>
      </EmptyState>
    </PageShell>
  );
}

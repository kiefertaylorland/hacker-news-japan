import type { ReactNode } from "react";
import { UserMenu } from "@/components/auth/UserMenu";
import { EmptyState } from "@/components/layout/EmptyState";

interface SignInPromptProps {
  icon: ReactNode;
  title: string;
  description: string;
  next: string;
}

/** Full-page prompt for signed-out visitors to a page that needs a GitHub account. */
export function SignInPrompt({ icon, title, description, next }: SignInPromptProps) {
  return (
    <main className="min-h-screen w-full px-4 py-16">
      <EmptyState className="mx-auto max-w-xl" icon={icon} title={title} description={description}>
        <UserMenu user={null} next={next} />
      </EmptyState>
    </main>
  );
}

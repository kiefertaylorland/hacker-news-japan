import Link from "next/link";
import { Suspense } from "react";
import { MessageCircleIcon } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/user";
import { getArticleContext } from "@/lib/chat/context";
import { isChatConfigured } from "@/lib/chat/request";
import { Chat } from "@/components/chat/Chat";
import { SignInPrompt } from "@/components/auth/SignInPrompt";
import { PageShell } from "@/components/layout/PageShell";
import { ErrorAlert } from "@/components/layout/ErrorAlert";

interface Props {
  searchParams: Promise<{ story?: string | string[] }>;
}

export default function ChatPage(props: Props) {
  return (
    <Suspense fallback={<p role="status">Loading chat…</p>}>
      <ChatContent {...props} />
    </Suspense>
  );
}

async function ChatContent({ searchParams }: Props) {
  const { story } = await searchParams;
  const storyId = typeof story === "string" ? story : undefined;
  const next = storyId ? `/chat?story=${encodeURIComponent(storyId)}` : "/chat";
  const user = await getCurrentUser();
  if (!user)
    return (
      <SignInPrompt
        icon={<MessageCircleIcon />}
        title="Discuss Japan with AI"
        description="Sign in to discuss articles, find related stories, and ask questions about Japan."
        next={next}
      />
    );
  let article: Awaited<ReturnType<typeof getArticleContext>> = null;
  if (story !== undefined) {
    try {
      if (!storyId || !/^[1-9]\d{0,19}$/.test(storyId))
        throw new Error();
      article = await getArticleContext(storyId);
      if (!article) throw new Error();
    } catch {
      return (
        <PageShell>
          <ErrorAlert>Could not load the selected article.</ErrorAlert>
          <Link href="/chat">Start a general chat</Link>
        </PageShell>
      );
    }
  }
  return (
    <PageShell>
      <Chat
        key={storyId}
        article={article}
        user={user}
        configured={isChatConfigured()}
      />
    </PageShell>
  );
}

import Link from "next/link";
import { SearchXIcon } from "lucide-react";
import { EmptyState } from "@/components/layout/EmptyState";
import { PageShell } from "@/components/layout/PageShell";

export default function StoryNotFound() {
  return (
    <PageShell>
      <EmptyState icon={<SearchXIcon aria-hidden="true" />} title={<h1>Story not found</h1>}
        description="This story is unavailable or the link is no longer valid.">
        <Link href="/" className="inline-flex min-h-11 items-center text-sm text-hn hover:underline">Browse stories</Link>
      </EmptyState>
    </PageShell>
  );
}

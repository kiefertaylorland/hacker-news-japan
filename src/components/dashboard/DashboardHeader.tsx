import type { ReactNode } from "react";
import { PageHeader } from "@/components/layout/PageHeader";

/** Shared by the streamed dashboard and its prerendered loading shell. */
export function DashboardHeader({ actions }: { actions: ReactNode }) {
  return (
    <PageHeader
      eyebrow={
        <div className="flex items-center gap-2">
          <div className="h-px w-8 bg-hn/60" />
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-hn/80">Hacker News</span>
        </div>
      }
      title={
        <div className="flex items-baseline gap-4">
          <h1 className="text-5xl font-bold tracking-tight text-slate-100">日本</h1>
          <span className="text-2xl font-light text-slate-400 tracking-wide">Japan</span>
        </div>
      }
      description="Browse, search, and filter Hacker News stories about Japan — updated in real time."
      actions={actions}
    />
  );
}

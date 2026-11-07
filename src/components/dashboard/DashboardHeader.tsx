import type { ReactNode } from "react";
import { PageHeader } from "@/components/layout/PageHeader";

/** Shared by the streamed dashboard and its prerendered loading shell. */
export function DashboardHeader({ actions }: { actions: ReactNode }) {
  return (
    <PageHeader
      eyebrow={
        <div className="flex items-center gap-2.5">
          <span className="size-2.5 rounded-full bg-hn shadow-[0_0_18px_rgba(255,102,0,0.65)]" />
          <span className="text-[0.6875rem] font-semibold uppercase tracking-[0.24em] text-slate-400">Hacker News</span>
        </div>
      }
      title={
        <div className="flex items-baseline gap-3 sm:gap-4">
          <h1 className="font-serif text-5xl font-semibold leading-none tracking-[-0.06em] text-white sm:text-6xl">日本</h1>
          <span className="text-lg font-light uppercase tracking-[0.18em] text-slate-400 sm:text-xl">Japan</span>
        </div>
      }
      description="Browse, search, and filter Hacker News stories about Japan — updated in real time."
      actions={actions}
    />
  );
}

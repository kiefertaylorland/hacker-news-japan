import type { ReactNode } from "react";

interface PageHeaderProps {
  eyebrow: ReactNode;
  title: ReactNode;
  description: ReactNode;
  actions: ReactNode;
}

export function PageHeader({ eyebrow, title, description, actions }: PageHeaderProps) {
  return (
    <header className="flex flex-col gap-5 border-b border-white/8 pb-6 sm:flex-row sm:items-start sm:justify-between sm:pb-8">
      <div className="min-w-0 space-y-3.5 [overflow-wrap:anywhere]">
        {eyebrow}
        {title}
        <p className="max-w-xl text-sm leading-6 text-slate-400">{description}</p>
      </div>
      <div className="max-w-full shrink-0 self-start sm:pt-1">{actions}</div>
    </header>
  );
}

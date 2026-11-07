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
      <div className="space-y-3.5">
        {eyebrow}
        {title}
        <p className="max-w-xl text-sm leading-6 text-slate-400">{description}</p>
      </div>
      <div className="self-start sm:pt-1">{actions}</div>
    </header>
  );
}

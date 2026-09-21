import type { ReactNode } from "react";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: ReactNode;
  title: ReactNode;
  description: ReactNode;
  children?: ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, children, className }: EmptyStateProps) {
  return (
    <Empty className={cn("border border-dashed border-white/10 bg-white/[0.02]", className)}>
      <EmptyHeader>
        <EmptyMedia variant="icon" className="bg-white/5 text-slate-400">
          {icon}
        </EmptyMedia>
        <EmptyTitle className="text-slate-200">{title}</EmptyTitle>
        <EmptyDescription className="text-slate-500">{description}</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>{children}</EmptyContent>
    </Empty>
  );
}

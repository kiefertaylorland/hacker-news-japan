"use client";

import type { SortBy } from "@/lib/types";
import { SORT_BY_OPTIONS } from "@/lib/constants";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

interface SortControlsProps {
  sortBy: SortBy;
  onChange: (sort: SortBy) => void;
}

export function SortControls({ sortBy, onChange }: SortControlsProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      <span className="text-xs font-medium uppercase tracking-wider text-slate-600">
        Sort:
      </span>
      <ToggleGroup
        type="single"
        value={sortBy}
        onValueChange={(value) => value && onChange(value as SortBy)}
        className="flex-wrap justify-start gap-1.5"
      >
        {SORT_BY_OPTIONS.map((option) => (
          <ToggleGroupItem
            key={option.value}
            value={option.value}
            size="sm"
            className="h-7 rounded-md border border-white/10 bg-white/5 px-2.5 text-xs font-medium text-slate-400 backdrop-blur-md transition-all hover:bg-white/[0.08] hover:text-slate-200 data-[state=on]:border-hn/40 data-[state=on]:bg-hn/15 data-[state=on]:text-hn data-[state=on]:shadow-[0_0_10px_rgba(255,102,0,0.12)]"
          >
            {option.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  );
}

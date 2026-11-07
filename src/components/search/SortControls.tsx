"use client";

import type { SortBy } from "@/lib/types";
import { SORT_BY_OPTIONS } from "@/lib/constants";
import { OptionToggleGroup } from "./OptionToggleGroup";

interface SortControlsProps {
  sortBy: SortBy;
  onChange: (sort: SortBy) => void;
}

export function SortControls({ sortBy, onChange }: SortControlsProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs lg:shrink-0">
      <span className="text-[0.6875rem] font-semibold uppercase tracking-[0.16em] text-slate-400">
        Sort:
      </span>
      <OptionToggleGroup
        options={SORT_BY_OPTIONS}
        value={sortBy}
        onChange={onChange}
        ariaLabel="Sort stories"
        size="sm"
        className="gap-1.5"
      />
    </div>
  );
}

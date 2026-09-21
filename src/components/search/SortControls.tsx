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
    <div className="flex flex-wrap items-center gap-2 text-xs">
      <span className="text-xs font-medium uppercase tracking-wider text-slate-600">
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

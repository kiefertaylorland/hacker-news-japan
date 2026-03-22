"use client";

import type { SortBy } from "@/lib/types";
import { SORT_BY_OPTIONS } from "@/lib/constants";

interface SortControlsProps {
  sortBy: SortBy;
  onChange: (sort: SortBy) => void;
}

export function SortControls({ sortBy, onChange }: SortControlsProps) {
  return (
    <div className="flex items-center gap-2 text-xs flex-wrap">
      <span className="text-slate-600 text-xs uppercase tracking-wider font-medium">Sort:</span>
      <div className="flex gap-1.5 flex-wrap">
        {SORT_BY_OPTIONS.map((option) => (
          <button
            key={option.value}
            onClick={() => onChange(option.value)}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
              sortBy === option.value
                ? "glass bg-hn/15 border-hn/40 text-hn shadow-[0_0_10px_rgba(255,102,0,0.12)]"
                : "glass bg-white/5 border-white/10 text-slate-400 hover:bg-white/[0.08] hover:text-slate-200 hover:border-white/20"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

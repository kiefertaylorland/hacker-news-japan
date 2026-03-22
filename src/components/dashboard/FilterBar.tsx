"use client";

import type { DateRange, StoryType } from "@/lib/types";
import { STORY_TYPE_OPTIONS, DATE_RANGE_OPTIONS } from "@/lib/constants";

interface FilterBarProps {
  storyType: StoryType;
  dateRange: DateRange;
  onStoryTypeChange: (type: StoryType) => void;
  onDateRangeChange: (range: DateRange) => void;
}

export function FilterBar({
  storyType,
  dateRange,
  onStoryTypeChange,
  onDateRangeChange,
}: FilterBarProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      {/* Story Type Filter */}
      <div className="flex flex-wrap gap-2">
        {STORY_TYPE_OPTIONS.map((option) => (
          <button
            key={option.value}
            onClick={() => onStoryTypeChange(option.value)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              storyType === option.value
                ? "glass bg-hn/15 border-hn/40 text-hn shadow-[0_0_12px_rgba(255,102,0,0.15)]"
                : "glass bg-white/5 border-white/10 text-slate-400 hover:bg-white/[0.08] hover:text-slate-200 hover:border-white/20"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {/* Date Range Filter */}
      <div className="flex items-center gap-2 text-xs">
        <span className="text-slate-600 text-xs uppercase tracking-wider font-medium">When:</span>
        <select
          value={dateRange}
          onChange={(e) => onDateRangeChange(e.target.value as DateRange)}
          className="glass-input text-xs font-medium"
        >
          {DATE_RANGE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

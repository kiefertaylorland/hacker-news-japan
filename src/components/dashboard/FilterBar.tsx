"use client";

import type { DateRange, StoryType } from "@/lib/types";
import { STORY_TYPE_OPTIONS, DATE_RANGE_OPTIONS } from "@/lib/constants";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
      <ToggleGroup
        type="single"
        value={storyType}
        onValueChange={(value) => value && onStoryTypeChange(value as StoryType)}
        className="flex-wrap justify-start gap-2"
      >
        {STORY_TYPE_OPTIONS.map((option) => (
          <ToggleGroupItem
            key={option.value}
            value={option.value}
            size="sm"
            className="rounded-lg border border-white/10 bg-white/5 px-3 text-xs font-medium text-slate-400 backdrop-blur-md transition-all hover:bg-white/[0.08] hover:text-slate-200 data-[state=on]:border-hn/40 data-[state=on]:bg-hn/15 data-[state=on]:text-hn data-[state=on]:shadow-[0_0_12px_rgba(255,102,0,0.15)]"
          >
            {option.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>

      {/* Date Range Filter */}
      <div className="flex items-center gap-2 text-xs">
        <span className="text-xs font-medium uppercase tracking-wider text-slate-600">
          When:
        </span>
        <Select
          value={dateRange}
          onValueChange={(value) => onDateRangeChange(value as DateRange)}
        >
          <SelectTrigger
            className="h-8 w-[140px] rounded-lg border-white/10 bg-white/5 text-xs font-medium text-slate-200 backdrop-blur-md focus:ring-hn/30"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="border-white/10 bg-popover/95 backdrop-blur-md">
            {DATE_RANGE_OPTIONS.map((option) => (
              <SelectItem
                key={option.value}
                value={option.value}
                className="text-xs focus:bg-hn/15 focus:text-hn"
              >
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

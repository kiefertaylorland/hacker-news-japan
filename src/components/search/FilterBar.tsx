"use client";

import type { DateRange, StoryType } from "@/lib/types";
import { STORY_TYPE_OPTIONS, DATE_RANGE_OPTIONS } from "@/lib/constants";
import { OptionToggleGroup } from "./OptionToggleGroup";
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
      <OptionToggleGroup
        options={STORY_TYPE_OPTIONS}
        value={storyType}
        onChange={onStoryTypeChange}
        ariaLabel="Story type"
        size="md"
        className="gap-2"
      />

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
            aria-label="Date range"
            className="h-11 sm:h-8 w-[140px] rounded-lg border-white/10 bg-white/5 text-xs font-medium text-slate-200 focus:ring-hn/30"
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

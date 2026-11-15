"use client";

import { DEFAULT_SEARCH_PARAMS, STORY_TYPE_OPTIONS, DATE_RANGE_OPTIONS, SORT_BY_OPTIONS } from "@/lib/constants";
import type { SearchParams } from "@/lib/types";
import { Button } from "@/components/ui/button";

interface Props extends SearchParams {
  setQuery: (value: string) => void;
  setStoryType: (value: SearchParams["storyType"]) => void;
  setDateRange: (value: SearchParams["dateRange"]) => void;
  setSortBy: (value: SearchParams["sortBy"]) => void;
  reset: () => void;
}

export function ActiveFilters(props: Props) {
  const filters = [
    { label: `Search: ${props.query}`, active: !!props.query, remove: () => props.setQuery("") },
    { label: `Type: ${STORY_TYPE_OPTIONS.find((o) => o.value === props.storyType)?.label}`, active: props.storyType !== DEFAULT_SEARCH_PARAMS.storyType, remove: () => props.setStoryType(DEFAULT_SEARCH_PARAMS.storyType) },
    { label: `When: ${DATE_RANGE_OPTIONS.find((o) => o.value === props.dateRange)?.label}`, active: props.dateRange !== DEFAULT_SEARCH_PARAMS.dateRange, remove: () => props.setDateRange(DEFAULT_SEARCH_PARAMS.dateRange) },
    { label: `Sort: ${SORT_BY_OPTIONS.find((o) => o.value === props.sortBy)?.label}`, active: props.sortBy !== DEFAULT_SEARCH_PARAMS.sortBy, remove: () => props.setSortBy(DEFAULT_SEARCH_PARAMS.sortBy) },
  ].filter((filter) => filter.active);
  return (
    <div id="search-filters" tabIndex={-1} aria-label="Active filters" className="flex flex-wrap items-center gap-2">
      {filters.map((filter) => <Button key={filter.label} variant="secondary" size="sm" className="h-auto min-h-11 min-w-0 max-w-full whitespace-normal text-left" aria-label={`Remove ${filter.label}`} onClick={() => {
        document.getElementById("search-filters")?.focus();
        filter.remove();
      }}><span className="min-w-0 break-all">{filter.label}</span><span className="shrink-0" aria-hidden="true">×</span></Button>)}
      {filters.length > 0 && <Button variant="ghost" size="sm" className="min-h-11" onClick={() => {
        document.getElementById("search-filters")?.focus();
        props.reset();
      }}>Reset all</Button>}
    </div>
  );
}

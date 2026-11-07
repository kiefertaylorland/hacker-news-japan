"use client";

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";

const ITEM_BASE =
  "h-11 border border-transparent bg-transparent text-xs font-medium text-slate-400 transition-colors hover:bg-white/6 hover:text-slate-200 data-[state=on]:border-hn/35 data-[state=on]:bg-hn/12 data-[state=on]:text-orange-300";

const SIZE_CLASSES = {
  md: "rounded-lg px-3 sm:h-9",
  sm: "rounded-md px-2.5 sm:h-8",
} as const;

interface OptionToggleGroupProps<T extends string> {
  options: readonly { label: string; value: T }[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
  size: keyof typeof SIZE_CLASSES;
  className?: string;
}

/** Single-select pill group; ignores the empty value Radix emits when the active item is re-clicked. */
export function OptionToggleGroup<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  size,
  className,
}: OptionToggleGroupProps<T>) {
  return (
    <ToggleGroup
      type="single"
      aria-label={ariaLabel}
      value={value}
      onValueChange={(next) => next && onChange(next as T)}
      className={cn("flex-wrap justify-start", className)}
    >
      {options.map((option) => (
        <ToggleGroupItem
          key={option.value}
          value={option.value}
          size="sm"
          className={cn(ITEM_BASE, SIZE_CLASSES[size])}
        >
          {option.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}

"use client";

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";

const ITEM_BASE =
  "h-11 border border-white/10 bg-white/5 text-xs font-medium text-slate-400 backdrop-blur-md transition-all hover:bg-white/[0.08] hover:text-slate-200 data-[state=on]:border-hn/40 data-[state=on]:bg-hn/15 data-[state=on]:text-hn";

const SIZE_CLASSES = {
  md: "sm:h-9 rounded-lg px-3 data-[state=on]:shadow-[0_0_12px_rgba(255,102,0,0.15)]",
  sm: "sm:h-7 rounded-md px-2.5 data-[state=on]:shadow-[0_0_10px_rgba(255,102,0,0.12)]",
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

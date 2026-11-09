"use client";

import { useRef } from "react";
import { XIcon, SearchIcon } from "lucide-react";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function SearchBar({
  value,
  onChange,
  placeholder = "Search Japan stories...",
}: SearchBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <InputGroup className="search-motion h-13 rounded-xl border-white/12 bg-white/[0.045] shadow-inner transition-colors has-[[data-slot=input-group-control]:focus-visible]:border-hn/60 has-[[data-slot=input-group-control]:focus-visible]:ring-hn/25">
      <InputGroupAddon>
        <SearchIcon className="text-slate-500 transition-colors group-has-[[data-slot=input-group-control]:focus-visible]/input-group:text-hn" />
      </InputGroupAddon>
      <InputGroupInput
        type="text"
        ref={inputRef}
        aria-label="Search Japan stories"
        inputMode="search"
        enterKeyHint="search"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="text-base text-slate-100 placeholder:text-slate-400 sm:text-[0.9375rem]"
      />
      {value && (
        <InputGroupAddon align="inline-end">
          <InputGroupButton
            size="icon-xs"
            aria-label="Clear search"
            onClick={() => {
              onChange("");
              // Stryker disable next-line OptionalChaining: this button only renders alongside the mounted input, so the ref is never null here.
              inputRef.current?.focus();
            }}
            className="size-11 sm:size-6 text-slate-400 hover:bg-white/10 hover:text-slate-100"
          >
            <XIcon />
          </InputGroupButton>
        </InputGroupAddon>
      )}
    </InputGroup>
  );
}

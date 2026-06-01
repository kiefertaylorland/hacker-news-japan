"use client";

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
  return (
    <InputGroup className="h-12 rounded-xl border-white/10 bg-white/5 shadow-[0_4px_24px_rgba(0,0,0,0.4)] backdrop-blur-md transition-colors has-[[data-slot=input-group-control]:focus-visible]:border-hn/50 has-[[data-slot=input-group-control]:focus-visible]:ring-hn/30">
      <InputGroupAddon>
        <SearchIcon className="text-slate-500 transition-colors group-has-[[data-slot=input-group-control]:focus-visible]/input-group:text-hn" />
      </InputGroupAddon>
      <InputGroupInput
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="text-base text-slate-100 placeholder:text-slate-500"
      />
      {value && (
        <InputGroupAddon align="inline-end">
          <InputGroupButton
            size="icon-xs"
            aria-label="Clear search"
            onClick={() => onChange("")}
            className="text-slate-400 hover:bg-white/10 hover:text-slate-100"
          >
            <XIcon />
          </InputGroupButton>
        </InputGroupAddon>
      )}
    </InputGroup>
  );
}

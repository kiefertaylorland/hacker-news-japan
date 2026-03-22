"use client";

import { XIcon, SearchIcon } from "lucide-react";

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
    <div className="relative group">
      <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-hn transition-colors duration-200" />
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="glass-input w-full pl-10 py-3 pr-10 placeholder-slate-500 focus:ring-1 focus:ring-hn/30 focus:border-hn/50"
      />
      {value && (
        <button
          onClick={() => onChange("")}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
          aria-label="Clear search"
        >
          <XIcon className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

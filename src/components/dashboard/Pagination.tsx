"use client";

import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import type { AlgoliaResponse } from "@/lib/types";

interface PaginationProps {
  results: AlgoliaResponse | null;
  currentPage: number;
  onPageChange: (page: number) => void;
  isLoading: boolean;
}

export function Pagination({
  results,
  currentPage,
  onPageChange,
  isLoading,
}: PaginationProps) {
  if (!results || results.nbPages <= 1) {
    return null;
  }

  const canGoPrev = currentPage > 0;
  const canGoNext = currentPage < results.nbPages - 1;

  return (
    <div className="flex items-center justify-center gap-2 mt-8">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={!canGoPrev || isLoading}
        className={`glass-button flex items-center gap-1 ${
          !canGoPrev || isLoading ? "opacity-50 cursor-not-allowed" : ""
        }`}
      >
        <ChevronLeftIcon className="w-4 h-4" />
        Previous
      </button>

      <div className="flex items-center gap-1">
        {Array.from({ length: Math.min(5, results.nbPages) }).map((_, i) => {
          const pageNum = i;
          const isActive = pageNum === currentPage;

          return (
            <button
              key={pageNum}
              onClick={() => onPageChange(pageNum)}
              disabled={isLoading}
              className={`px-2 py-1 rounded text-xs font-medium transition-all ${
                isActive
                  ? "glass bg-hn/15 border-hn/40 text-hn font-bold"
                  : "glass bg-white/5 border-white/10 text-slate-400 hover:bg-white/[0.08] hover:border-white/20"
              } ${isLoading ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              {pageNum + 1}
            </button>
          );
        })}
      </div>

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={!canGoNext || isLoading}
        className={`glass-button flex items-center gap-1 ${
          !canGoNext || isLoading ? "opacity-50 cursor-not-allowed" : ""
        }`}
      >
        Next
        <ChevronRightIcon className="w-4 h-4" />
      </button>
    </div>
  );
}

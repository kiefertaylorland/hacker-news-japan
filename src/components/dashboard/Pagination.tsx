"use client";

import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import type { AlgoliaResponse } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Pagination as PaginationRoot,
  PaginationContent,
  PaginationItem,
} from "@/components/ui/pagination";

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
    <PaginationRoot className="mt-8">
      <PaginationContent className="gap-2">
        <PaginationItem>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={!canGoPrev || isLoading}
            className="gap-1 border border-white/10 bg-white/5 text-slate-300 backdrop-blur-md hover:bg-white/10 hover:text-slate-100"
          >
            <ChevronLeftIcon className="h-4 w-4" />
            Previous
          </Button>
        </PaginationItem>

        <div className="flex items-center gap-1">
          {Array.from({ length: Math.min(5, results.nbPages) }).map((_, i) => {
            const isActive = i === currentPage;
            return (
              <PaginationItem key={i}>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onPageChange(i)}
                  disabled={isLoading}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "h-8 w-8 border text-xs font-medium backdrop-blur-md",
                    isActive
                      ? "border-hn/40 bg-hn/15 text-hn shadow-[0_0_10px_rgba(255,102,0,0.12)] hover:bg-hn/20 hover:text-hn"
                      : "border-white/10 bg-white/5 text-slate-400 hover:bg-white/10 hover:text-slate-200"
                  )}
                >
                  {i + 1}
                </Button>
              </PaginationItem>
            );
          })}
        </div>

        <PaginationItem>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={!canGoNext || isLoading}
            className="gap-1 border border-white/10 bg-white/5 text-slate-300 backdrop-blur-md hover:bg-white/10 hover:text-slate-100"
          >
            Next
            <ChevronRightIcon className="h-4 w-4" />
          </Button>
        </PaginationItem>
      </PaginationContent>
    </PaginationRoot>
  );
}

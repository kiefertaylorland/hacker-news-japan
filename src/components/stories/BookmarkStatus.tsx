"use client";

import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";

interface Props {
  message: string;
  errors: Record<string, string>;
  visibleIds: string[];
  onRetry: (id: string) => void;
}

export function BookmarkStatus({ message, errors, visibleIds, onRetry }: Props) {
  const previousErrors = useRef(errors);
  useEffect(() => {
    const failedId = Object.keys(errors).find((id) => !previousErrors.current[id]);
    previousErrors.current = errors;
    if (failedId && (document.activeElement === document.body || document.activeElement?.id === "saved-heading")) {
      document.getElementById(`bookmark-${failedId}`)?.focus();
    }
  }, [errors]);
  return <div>
    <p role="status" aria-live="polite" aria-atomic="true" className="min-h-6 text-sm text-muted-foreground">{message}</p>
    {Object.entries(errors).filter(([id]) => !visibleIds.includes(id)).map(([id, error]) =>
      <div key={id} role="alert" className="editorial-panel mt-2 flex flex-wrap items-center gap-3 p-3 text-sm text-red-300">
        <p>{error}</p><Button id={`bookmark-${id}`} variant="outline" onClick={() => onRetry(id)}>Retry bookmark</Button>
      </div>
    )}
  </div>;
}

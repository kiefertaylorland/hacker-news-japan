"use client";

export function StoryCardSkeleton() {
  return (
    <div className="glass p-4 animate-pulse">
      {/* Badge and domain */}
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="h-5 w-16 rounded-full bg-white/10" />
        <div className="h-4 w-24 rounded bg-white/10" />
      </div>

      {/* Title lines */}
      <div className="space-y-2 mb-3">
        <div className="h-4 w-full rounded bg-white/10" />
        <div className="h-4 w-5/6 rounded bg-white/10" />
        <div className="h-4 w-4/6 rounded bg-white/10" />
      </div>

      {/* Divider */}
      <div className="border-t border-white/5 my-3" />

      {/* Stats */}
      <div className="flex gap-4 mb-3">
        <div className="h-4 w-12 rounded bg-white/10" />
        <div className="h-4 w-12 rounded bg-white/10" />
        <div className="flex-1" />
        <div className="h-4 w-20 rounded bg-white/10" />
      </div>

      {/* Divider */}
      <div className="border-t border-white/5 my-3" />

      {/* Footer */}
      <div className="flex items-center justify-between">
        <div className="h-3 w-20 rounded bg-white/10" />
        <div className="h-3 w-3 rounded bg-white/10" />
      </div>
    </div>
  );
}

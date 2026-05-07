"use client";

import { Skeleton } from "@/components/ui/skeleton";

export function VereadorCardSkeleton() {
  return (
    <div className="stat-card">
      <div className="flex items-start gap-4">
        <Skeleton className="w-14 h-14 rounded-full" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-20" />
        </div>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-md" />
        ))}
      </div>
      <div className="mt-2 grid grid-cols-3 gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-md" />
        ))}
      </div>
      <Skeleton className="mt-3 h-12 rounded-md" />
    </div>
  );
}

export function StatCardSkeleton() {
  return (
    <div className="stat-card">
      <Skeleton className="h-3 w-24 mb-2" />
      <Skeleton className="h-7 w-16" />
      <Skeleton className="h-3 w-20 mt-1" />
    </div>
  );
}

export function ProjetoCardSkeleton() {
  return (
    <div className="stat-card">
      <div className="flex items-start justify-between">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-5 w-20 rounded-full" />
      </div>
      <Skeleton className="h-4 w-full mt-3" />
      <Skeleton className="h-4 w-3/4 mt-1" />
      <Skeleton className="h-3 w-32 mt-3" />
    </div>
  );
}

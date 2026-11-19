import { Skeleton } from '@/components/ui/primitives';

/** Shared route-segment loading skeleton. Announces "Loading" once; blocks pulse only when motion is allowed (see Skeleton). */
export function RouteLoading({ cards = 4 }: { cards?: number }) {
  return (
    <div role="status" aria-busy="true" className="space-y-4 p-4 sm:p-6">
      <span className="sr-only">Loading</span>
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-4 w-72 max-w-full" />
      <div className="grid gap-3 sm:grid-cols-2">
        {Array.from({ length: cards }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    </div>
  );
}

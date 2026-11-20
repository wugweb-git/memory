export default function Loading() {
  return (
    <div role="status" aria-live="polite" className="mx-auto min-h-[60vh] max-w-2xl px-4 py-8">
      <span className="sr-only">Loading</span>
      <div aria-hidden="true" className="space-y-3">
        <div className="h-6 w-1/3 rounded-lg bg-bg-tertiary motion-safe:animate-pulse" />
        <div className="h-4 w-full rounded-lg bg-bg-secondary motion-safe:animate-pulse" />
        <div className="h-4 w-5/6 rounded-lg bg-bg-secondary motion-safe:animate-pulse" />
      </div>
    </div>
  );
}

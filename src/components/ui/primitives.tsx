import * as React from "react";
import { cn } from "@/lib/utils";

/** Card surface: token-driven container used for panels and list items. */
export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("rounded-2xl border border-border-primary bg-bg-elevated p-4", className)}
      {...props}
    />
  );
}

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "min-h-10 w-full rounded-xl border border-border-primary bg-bg-elevated px-3 py-2 text-sm text-text-primary placeholder:text-text-disabled focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
);
Input.displayName = "Input";

/** Loading placeholder block. Size it with className (h-*, w-*). */
export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden="true"
      className={cn("animate-pulse rounded-xl bg-bg-tertiary", className)}
      {...props}
    />
  );
}

/** Consistent empty state: title, optional hint and action. */
export function EmptyState({
  title,
  hint,
  action,
  className,
}: {
  title: string;
  hint?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      role="status"
      className={cn(
        "flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border-primary px-6 py-10 text-center",
        className
      )}
    >
      <p className="text-sm font-semibold text-text-secondary">{title}</p>
      {hint ? <p className="max-w-sm text-xs text-text-tertiary">{hint}</p> : null}
      {action}
    </div>
  );
}

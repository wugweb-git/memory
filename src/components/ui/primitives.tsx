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

const fieldClasses =
  "min-h-10 w-full rounded-xl border border-border-primary bg-bg-elevated px-3 py-2 text-sm text-text-primary placeholder:text-text-disabled disabled:cursor-not-allowed disabled:opacity-50 aria-[invalid=true]:border-danger";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input ref={ref} className={cn(fieldClasses, className)} {...props} />
  )
);
Input.displayName = "Input";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea ref={ref} className={cn(fieldClasses, "min-h-24 resize-y", className)} {...props} />
));
Textarea.displayName = "Textarea";

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, ...props }, ref) => (
    <select ref={ref} className={cn(fieldClasses, className)} {...props} />
  )
);
Select.displayName = "Select";

type ChipTone = "neutral" | "accent" | "success" | "warning" | "danger";

const chipTones: Record<ChipTone, string> = {
  neutral: "bg-bg-secondary text-text-secondary border-border-primary",
  accent: "bg-accent/10 text-accent border-accent/30",
  success: "bg-success/10 text-success border-success/30",
  warning: "bg-warning/10 text-warning border-warning/30",
  danger: "bg-danger/10 text-danger border-danger/30",
};

/** Small status or tag pill. Never rely on tone alone: include text. */
export function Chip({
  tone = "neutral",
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: ChipTone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold",
        chipTones[tone],
        className
      )}
      {...props}
    />
  );
}

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

/** Consistent error state. role="alert" so the failure is announced once when it appears. */
export function ErrorState({
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
      role="alert"
      className={cn(
        "flex flex-col items-center justify-center gap-2 rounded-2xl border border-danger/30 bg-danger/5 px-6 py-10 text-center",
        className
      )}
    >
      <p className="text-sm font-semibold text-danger">{title}</p>
      {hint ? <p className="max-w-sm text-xs text-text-secondary">{hint}</p> : null}
      {action}
    </div>
  );
}

/** Consistent loading state with a polite live announcement. */
export function LoadingState({ label = "Loading", className }: { label?: string; className?: string }) {
  return (
    <div
      role="status"
      aria-busy="true"
      className={cn("flex items-center justify-center gap-2 px-6 py-10 text-sm text-text-tertiary", className)}
    >
      <span
        aria-hidden="true"
        className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
      />
      <span>{label}</span>
    </div>
  );
}

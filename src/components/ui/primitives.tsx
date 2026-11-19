import * as React from "react";
import { AlertTriangle, CheckCircle2, ChevronDown, Circle, Info, XCircle } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Spinner } from "@/components/ui/button";

/* ──────────────────────────────────────────────────────────────────────────
   Shared primitives. Single source of spacing (4/8), radius (control / card /
   panel / pill), elevation (elev-0..3) and motion (duration / easing tokens).
   Colour comes only from token classes. See design-system/MASTER.md.
   ────────────────────────────────────────────────────────────────────────── */

/** Card surface: token-driven container used for panels and list items.
 *  `elevation` 0 is flat (border only, default); 1 resting; 2 raised. */
export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  elevation?: 0 | 1 | 2;
}

const cardElevation: Record<0 | 1 | 2, string> = {
  0: "",
  1: "shadow-elev-1",
  2: "shadow-elev-2",
};

export function Card({ className, elevation = 0, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-card border border-border-primary bg-bg-elevated p-4",
        cardElevation[elevation],
        className
      )}
      {...props}
    />
  );
}

const controlBase =
  "w-full rounded-control border bg-bg-elevated px-3 text-sm text-text-primary placeholder:text-text-disabled " +
  "transition-[border-color,box-shadow] duration-fast ease-standard " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-50 disabled:cursor-not-allowed " +
  "aria-[invalid=true]:border-danger";

function controlBorder(invalid?: boolean) {
  return invalid ? "border-danger" : "border-border-primary";
}

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Marks the field invalid: red border plus aria-invalid. Always pair with visible error text (see Field). */
  invalid?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, invalid, ...props }, ref) => (
    <input
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(controlBase, controlBorder(invalid), "min-h-10 py-2", className)}
      {...props}
    />
  )
);
Input.displayName = "Input";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, invalid, rows = 4, ...props }, ref) => (
    <textarea
      ref={ref}
      rows={rows}
      aria-invalid={invalid || undefined}
      className={cn(controlBase, controlBorder(invalid), "min-h-24 py-2 leading-normal resize-y", className)}
      {...props}
    />
  )
);
Textarea.displayName = "Textarea";

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  invalid?: boolean;
}

/** Native select (best mobile behaviour) with a token-styled chevron. */
export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, invalid, children, ...props }, ref) => (
    <div className="relative w-full">
      <select
        ref={ref}
        aria-invalid={invalid || undefined}
        className={cn(controlBase, controlBorder(invalid), "min-h-10 appearance-none py-2 pr-10", className)}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        size={16}
        aria-hidden="true"
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary"
      />
    </div>
  )
);
Select.displayName = "Select";

/** Label + control + helper/error wrapper. Label sits above, error below, never placeholder-only.
 *  Pass the control as children and give it `id={id}`; this wires aria-describedby text via ids. */
export function Field({
  id,
  label,
  hint,
  error,
  required,
  className,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <label htmlFor={id} className="text-sm font-medium text-text-primary">
        {label}
        {required ? <span aria-hidden="true" className="text-danger"> *</span> : null}
      </label>
      {children}
      {hint && !error ? (
        <p id={`${id}-hint`} className="text-xs text-text-tertiary">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-error`} role="alert" className="flex items-center gap-1 text-xs font-medium text-danger">
          <XCircle size={14} aria-hidden="true" className="shrink-0" />
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** Loading placeholder block. Size it with className (h-*, w-*). Pulse only when motion is allowed. */
export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden="true"
      className={cn("motion-safe:animate-pulse rounded-control bg-bg-tertiary", className)}
      {...props}
    />
  );
}

/** Consistent empty state: optional icon, title, optional hint and action. */
export function EmptyState({
  title,
  hint,
  action,
  icon,
  className,
}: {
  title: string;
  hint?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      role="status"
      className={cn(
        "flex flex-col items-center justify-center gap-2 rounded-card border border-dashed border-border-primary px-6 py-10 text-center",
        className
      )}
    >
      {icon ? (
        <span aria-hidden="true" className="mb-1 text-text-tertiary">
          {icon}
        </span>
      ) : null}
      <p className="text-sm font-semibold text-text-secondary">{title}</p>
      {hint ? <p className="max-w-sm text-xs text-text-tertiary">{hint}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
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
        "flex flex-col items-center justify-center gap-2 rounded-card border border-danger/30 bg-danger/5 px-6 py-10 text-center",
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
      <Spinner />
      <span>{label}</span>
    </div>
  );
}

/** Small status or tag pill. Never rely on tone alone: include text. */
type ChipTone = "neutral" | "accent" | "success" | "warning" | "danger";

const chipTones: Record<ChipTone, string> = {
  neutral: "bg-bg-secondary text-text-secondary border-border-primary",
  accent: "bg-accent/10 text-accent border-accent/30",
  success: "bg-success/10 text-success border-success/30",
  warning: "bg-warning/10 text-warning border-warning/30",
  danger: "bg-danger/10 text-danger border-danger/30",
};

export function Chip({
  tone = "neutral",
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: ChipTone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-pill border px-2.5 py-0.5 text-xs font-semibold",
        chipTones[tone],
        className
      )}
      {...props}
    />
  );
}

/* ── Badge and StatusPill ─────────────────────────────────────────────────
   Meaning is never colour alone: StatusPill always renders an icon AND text.
   Surfaces stay elevated white with a toned border so text keeps AA contrast. */

export type Tone = "neutral" | "success" | "warning" | "danger" | "info";

const toneText: Record<Tone, string> = {
  neutral: "text-text-secondary",
  success: "text-success",
  warning: "text-warning",
  danger: "text-danger",
  info: "text-text-primary",
};

const toneBorder: Record<Tone, string> = {
  neutral: "border-border-primary",
  success: "border-success/40",
  warning: "border-warning/40",
  danger: "border-danger/40",
  info: "border-accent",
};

const toneIcon: Record<Tone, LucideIcon> = {
  neutral: Circle,
  success: CheckCircle2,
  warning: AlertTriangle,
  danger: XCircle,
  info: Info,
};

/** Compact label or count. Optional leading icon. For state, use StatusPill. */
export function Badge({
  tone = "neutral",
  icon,
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: Tone; icon?: React.ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-pill border bg-bg-elevated px-2 py-0.5 text-2xs font-semibold",
        toneBorder[tone],
        toneText[tone],
        className
      )}
      {...props}
    >
      {icon ? <span aria-hidden="true" className="inline-flex shrink-0">{icon}</span> : null}
      {children}
    </span>
  );
}

/** Status indicator: icon + text, toned border. Use for health, sync, publish state. */
export function StatusPill({
  tone = "neutral",
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  const Icon = toneIcon[tone];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-pill border bg-bg-elevated px-2 py-1 text-xs font-medium",
        toneBorder[tone],
        toneText[tone],
        className
      )}
      {...props}
    >
      <Icon size={14} aria-hidden="true" className="shrink-0" />
      {children}
    </span>
  );
}

/* ── Toolbar and PageHeader ───────────────────────────────────────────── */

/** Row of controls (filters, bulk actions). Wraps on small screens, 8px gaps. */
export function Toolbar({
  label,
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { label?: string }) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cn("flex flex-wrap items-center gap-2", className)}
      {...props}
    >
      {children}
    </div>
  );
}

/** Page title block with an actions slot. Stacks on phones (actions drop below, full width
 *  wrap), sits inline from sm up. Renders the page h1; use exactly once per route. */
export function PageHeader({
  title,
  subtitle,
  actions,
  className,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "flex flex-col gap-4 rounded-panel border border-border-secondary bg-bg-elevated p-5 sm:flex-row sm:items-start sm:justify-between",
        className
      )}
    >
      <div className="min-w-0">
        <h1 className="text-lg font-semibold text-text-primary">{title}</h1>
        {subtitle ? <p className="mt-1 text-sm text-text-tertiary">{subtitle}</p> : null}
      </div>
      {actions ? <Toolbar className="shrink-0">{actions}</Toolbar> : null}
    </header>
  );
}

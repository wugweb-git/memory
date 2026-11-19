import * as React from "react";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, ChevronDown, ChevronRight, Circle, Info, XCircle } from "lucide-react";
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
  /** Material 3 container styles. outlined (default): white + border. filled: tonal stone, no border,
   *  for grouped or secondary content. elevated: white + border-secondary + resting shadow. */
  variant?: "outlined" | "filled" | "elevated";
}

const cardElevation: Record<0 | 1 | 2, string> = {
  0: "",
  1: "shadow-elev-1",
  2: "shadow-elev-2",
};

const cardVariant: Record<NonNullable<CardProps["variant"]>, string> = {
  outlined: "border border-border-primary bg-bg-elevated",
  filled: "bg-bg-secondary",
  elevated: "border border-border-secondary bg-bg-elevated shadow-elev-1",
};

export function Card({ className, elevation = 0, variant = "outlined", ...props }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-card p-4",
        cardVariant[variant],
        cardElevation[elevation],
        className
      )}
      {...props}
    />
  );
}

/* 16px text on phones (iOS does not zoom on focus), 14px from md up. 44px tall. */
const controlBase =
  "w-full rounded-control border bg-bg-elevated px-4 text-base md:text-sm text-text-primary placeholder:text-text-tertiary " +
  "transition-[border-color,box-shadow] duration-fast ease-standard " +
  "focus-visible:border-text-primary disabled:opacity-50 disabled:cursor-not-allowed " +
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
      className={cn(controlBase, controlBorder(invalid), "min-h-control py-2", className)}
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
      className={cn(controlBase, controlBorder(invalid), "min-h-24 py-3 leading-normal resize-y", className)}
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
        className={cn(controlBase, controlBorder(invalid), "min-h-control appearance-none py-2 pr-11", className)}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        size={20}
        aria-hidden="true"
        className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-text-tertiary"
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
        <p id={`${id}-error`} role="alert" className="flex items-start gap-1 text-xs font-medium text-danger">
          <XCircle size={14} aria-hidden="true" className="mt-0.5 shrink-0" />
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** Preferred form field. Same layout as Field, but it also WIRES the control for you:
 *  pass a single Input/Textarea/Select (or any element accepting id/aria props) as the child and
 *  it receives `id`, `aria-describedby` (hint and error), `aria-invalid` and `aria-required`.
 *  Label is always visible (never placeholder-only); helper stays visible under the control;
 *  the error replaces nothing, it is added with an icon plus text and announced via role="alert". */
export function FormField({
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
  children: React.ReactElement;
}) {
  const describedBy = [hint ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean).join(" ") || undefined;
  const control = React.cloneElement(children, {
    id,
    "aria-describedby": describedBy,
    "aria-invalid": error ? true : undefined,
    "aria-required": required || undefined,
    invalid: error ? true : undefined,
  } as Record<string, unknown>);
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <label htmlFor={id} className="text-sm font-medium text-text-primary">
        {label}
        {required ? <span aria-hidden="true" className="text-danger"> *</span> : null}
      </label>
      {control}
      {hint ? (
        <p id={`${id}-hint`} className="text-xs text-text-tertiary">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-error`} role="alert" className="flex items-start gap-1 text-xs font-medium text-danger">
          <XCircle size={14} aria-hidden="true" className="mt-0.5 shrink-0" />
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
      <p className="text-base font-semibold text-text-primary">{title}</p>
      {hint ? <p className="max-w-sm text-sm text-text-tertiary">{hint}</p> : null}
      {action ? <div className="mt-3">{action}</div> : null}
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
      <p className="text-base font-semibold text-danger">{title}</p>
      {hint ? <p className="max-w-sm text-sm text-text-secondary">{hint}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
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
  // Text uses text-primary: cyan text on its own tint measures ~2.3:1 (fails 1.4.3). Cyan stays in the border and tint.
  accent: "bg-accent/10 text-text-primary border-accent/60",
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

/** Page title block (Material 3 headline). FLAT: no box, so a page does not open with a card
 *  inside a card. Phone: 22px headline, 14px description, actions wrap below at full tap size.
 *  Renders the page h1; use exactly once per route. The h1 carries data-page-title so the shell's
 *  top bar can show the title only once this one has scrolled out of view (no duplicate titles). */
export function PageHeader({
  title,
  subtitle,
  description,
  eyebrow,
  actions,
  className,
}: {
  title: string;
  /** Supporting sentence under the title (alias: description). */
  subtitle?: string;
  description?: string;
  /** Small uppercase label above the title (the one allowed all-caps use). */
  eyebrow?: string;
  actions?: React.ReactNode;
  className?: string;
}) {
  const body = description ?? subtitle;
  return (
    <header className={cn("flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="min-w-0">
        {eyebrow ? (
          <p className="mb-1 text-2xs font-semibold uppercase tracking-widest text-text-tertiary">{eyebrow}</p>
        ) : null}
        <h1 data-page-title className="type-headline text-text-primary md:text-2xl">
          {title}
        </h1>
        {body ? <p className="mt-1 max-w-prose text-sm text-text-tertiary">{body}</p> : null}
      </div>
      {actions ? <Toolbar className="shrink-0">{actions}</Toolbar> : null}
    </header>
  );
}

/* ── Section ──────────────────────────────────────────────────────────────
   A titled block of a page. 12px between header and content; put Sections inside
   <Stack> (32px between sections). */

/** Section: h2 title (title-medium, 16px semibold), optional description and a trailing action
 *  (e.g. "See all"), then the content. Labelled by its heading for screen readers. */
export function Section({
  title,
  description,
  action,
  headingLevel = 2,
  className,
  children,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  headingLevel?: 2 | 3;
  className?: string;
  children: React.ReactNode;
}) {
  const id = React.useId();
  const Heading = (headingLevel === 3 ? "h3" : "h2") as "h2" | "h3";
  return (
    <section aria-labelledby={id} className={cn("space-y-3", className)}>
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <Heading id={id} className="type-title text-text-primary">
            {title}
          </Heading>
          {description ? <p className="mt-0.5 text-sm text-text-tertiary">{description}</p> : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      {children}
    </section>
  );
}

/** Vertical rhythm helper for a page: 32px between Sections (gap-8). */
export function Stack({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col gap-8", className)} {...props} />;
}

/* ── ListGroup and ListRow ────────────────────────────────────────────────
   Material 3 list: rows 56px (72px with a supporting line), leading icon, trailing slot,
   the whole row is the tap target with a state layer. */

/** Container for ListRow children. Rounded card surface, hairline dividers. */
export function ListGroup({ className, children, ...props }: React.HTMLAttributes<HTMLUListElement>) {
  return (
    <ul
      className={cn(
        "divide-y divide-border-secondary overflow-hidden rounded-card border border-border-primary bg-bg-elevated",
        className
      )}
      {...props}
    >
      {children}
    </ul>
  );
}

type ListRowBase = {
  /** Leading icon (rendered in a 40px tonal tile, decorative). */
  icon?: React.ReactNode;
  title: React.ReactNode;
  /** Supporting text under the title (14px, wraps; the row grows). */
  supporting?: React.ReactNode;
  /** Trailing content: Badge, StatusPill, value text. A chevron is added automatically for href rows. */
  trailing?: React.ReactNode;
  selected?: boolean;
  className?: string;
};

export type ListRowProps = ListRowBase &
  (
    | { href: string; onClick?: undefined }
    | { onClick: () => void; href?: undefined }
    | { href?: undefined; onClick?: undefined }
  );

/** One row. Renders `<li>` containing a Link (href), a button (onClick) or static content.
 *  Put inside ListGroup. Interactive rows are >=56px tall with a state layer and focus ring.
 *  Do not put interactive controls in `trailing` of an interactive row (nested interactive). */
export function ListRow({ icon, title, supporting, trailing, selected, href, onClick, className }: ListRowProps) {
  const inner = (
    <>
      {icon ? (
        <span
          aria-hidden="true"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-control bg-bg-secondary text-text-secondary"
        >
          {icon}
        </span>
      ) : null}
      <span className="min-w-0 flex-1">
        <span className="block text-base font-medium leading-snug text-text-primary">{title}</span>
        {supporting ? <span className="block text-sm leading-snug text-text-tertiary">{supporting}</span> : null}
      </span>
      {trailing ? <span className="flex shrink-0 items-center gap-2 text-sm text-text-tertiary">{trailing}</span> : null}
      {href && !trailing ? (
        <ChevronRight size={20} aria-hidden="true" className="shrink-0 text-text-tertiary" />
      ) : null}
    </>
  );
  const row = cn(
    "flex w-full items-center gap-4 px-4 py-2 text-left",
    supporting ? "min-h-[4.5rem]" : "min-h-14",
    selected && "bg-accent/10"
  );
  return (
    <li className={className}>
      {href ? (
        <Link href={href} aria-current={selected ? "page" : undefined} className={cn(row, "state-layer")}>
          {inner}
        </Link>
      ) : onClick ? (
        <button type="button" onClick={onClick} aria-pressed={selected} className={cn(row, "state-layer")}>
          {inner}
        </button>
      ) : (
        <div className={row}>{inner}</div>
      )}
    </li>
  );
}

/* ── SegmentedTabs ────────────────────────────────────────────────────────
   Material 3 segmented control / tabs. Real tab semantics: roving tabindex, Arrow / Home / End. */

export type SegmentedTabItem = { value: string; label: string; icon?: React.ReactNode; count?: number };

/** Ids for wiring panels: give the panel `id={segmentedIds(idBase, value).panel}`,
 *  role="tabpanel" and `aria-labelledby={segmentedIds(idBase, value).tab}`. */
export function segmentedIds(idBase: string, value: string) {
  return { tab: `${idBase}-tab-${value}`, panel: `${idBase}-panel-${value}` };
}

/** Controlled tab strip. 44px tall tabs; scrolls horizontally (no wrapping) when it overflows;
 *  the selected tab has a raised segment AND a bold label (never colour alone). */
export function SegmentedTabs({
  idBase,
  label,
  items,
  value,
  onChange,
  className,
}: {
  idBase: string;
  label: string;
  items: ReadonlyArray<SegmentedTabItem>;
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  const refs = React.useRef<Array<HTMLButtonElement | null>>([]);
  const onKeyDown = (e: React.KeyboardEvent, index: number) => {
    let next = -1;
    if (e.key === "ArrowRight") next = (index + 1) % items.length;
    else if (e.key === "ArrowLeft") next = (index - 1 + items.length) % items.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = items.length - 1;
    if (next < 0) return;
    e.preventDefault();
    onChange(items[next].value);
    refs.current[next]?.focus();
  };
  return (
    <div
      role="tablist"
      aria-label={label}
      className={cn(
        "scrollbar-hide flex gap-1 overflow-x-auto rounded-control border border-border-primary bg-bg-secondary p-1",
        className
      )}
    >
      {items.map((item, i) => {
        const selected = item.value === value;
        return (
          <button
            key={item.value}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="tab"
            id={segmentedIds(idBase, item.value).tab}
            aria-selected={selected}
            aria-controls={segmentedIds(idBase, item.value).panel}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(item.value)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className={cn(
              "state-layer inline-flex min-h-control min-w-control flex-1 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-control px-4 text-sm",
              selected
                ? "bg-bg-elevated font-semibold text-text-primary shadow-elev-1"
                : "font-medium text-text-secondary"
            )}
          >
            {item.icon ? <span aria-hidden="true" className="inline-flex shrink-0">{item.icon}</span> : null}
            {item.label}
            {item.count !== undefined ? (
              <span className="rounded-pill bg-bg-tertiary px-2 text-xs font-semibold text-text-secondary">{item.count}</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

/* ── FilterChip ───────────────────────────────────────────────────────────
   Toggle chip for filters. 44px touch target, fill + border change + aria-pressed. */
export function FilterChip({
  pressed,
  onClick,
  children,
  className,
}: {
  pressed: boolean;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={cn(
        "state-layer inline-flex min-h-control items-center gap-1.5 rounded-pill border px-4 text-sm font-medium",
        pressed
          ? "border-text-primary bg-bg-tertiary text-text-primary"
          : "border-border-primary bg-bg-elevated text-text-secondary",
        className
      )}
    >
      {children}
    </button>
  );
}

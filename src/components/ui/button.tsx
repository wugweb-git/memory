import * as React from "react";
import { cn } from "@/lib/utils";

type ButtonVariant = "default" | "outline" | "ghost" | "danger";
type ButtonSize = "default" | "sm" | "lg" | "icon";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Shows a spinner, sets aria-busy and blocks clicks while keeping the label width. */
  loading?: boolean;
  /** Optional text announced instead of the label while loading (default: the label itself). */
  loadingLabel?: string;
}

const variantClasses: Record<ButtonVariant, string> = {
  default: "bg-text-primary text-bg-primary hover:bg-text-secondary",
  outline:
    "bg-bg-elevated border border-border-primary text-text-primary hover:bg-bg-secondary",
  ghost:
    "bg-transparent text-text-tertiary hover:bg-bg-secondary hover:text-text-primary",
  danger: "bg-danger text-bg-primary hover:opacity-90",
};

/** Shared control heights: every size meets the 44px touch floor on coarse pointers (see globals.css). */
export const controlSizeClasses: Record<ButtonSize, string> = {
  default: "min-h-10 px-4 py-2.5 text-sm",
  sm: "min-h-9 px-3 py-2 text-xs",
  lg: "min-h-11 px-6 py-3 text-base",
  icon: "h-10 w-10 p-0",
};

/** Tiny inline spinner; reduced-motion users get a static ring (see globals.css). */
export function Spinner({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-block h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent",
        className
      )}
    />
  );
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "default",
      size = "default",
      type = "button",
      loading = false,
      loadingLabel,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        className={cn(
          "inline-flex touch-manipulation items-center justify-center gap-2 rounded-xl font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50",
          variantClasses[variant],
          controlSizeClasses[size],
          className
        )}
        {...props}
      >
        {loading ? <Spinner /> : null}
        {loading && loadingLabel ? loadingLabel : children}
      </button>
    );
  }
);

Button.displayName = "Button";

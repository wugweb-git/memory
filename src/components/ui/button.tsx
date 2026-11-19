import * as React from "react";
import { cn } from "@/lib/utils";

type ButtonVariant = "default" | "tonal" | "outline" | "ghost" | "danger";
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

/** Filled = default, tonal = secondary emphasis, outline = medium, ghost = text button.
 *  Every variant carries a Material state layer (hover / focus / pressed overlay). */
const variantClasses: Record<ButtonVariant, string> = {
  default: "bg-text-primary text-bg-primary",
  tonal: "bg-bg-tertiary text-text-primary",
  outline: "bg-bg-elevated border border-border-primary text-text-primary",
  ghost: "bg-transparent text-text-secondary hover:text-text-primary",
  danger: "bg-danger text-bg-elevated",
};

/** Heights: sm 40, default 44, lg 48, icon 44x44 (Material 3 minimum target, WCAG 2.5.5).
 *  Text is 14px label-large (16px on lg). Use `lg` for the one primary action of a screen. */
export const controlSizeClasses: Record<ButtonSize, string> = {
  default: "min-h-control px-5 py-2 text-sm",
  sm: "min-h-control md:min-h-10 px-4 py-2 text-sm",
  lg: "min-h-control-lg px-6 py-2 text-base",
  icon: "h-control w-control p-0",
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
          "state-layer inline-flex items-center justify-center gap-2 rounded-control font-medium",
          "transition-[background-color,color,opacity] duration-fast ease-standard",
          "disabled:opacity-40 disabled:cursor-not-allowed",
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

/** Icon-only button, always 44x44. `label` is required and becomes the accessible name
 *  (and the native tooltip). Pass the icon as children with aria-hidden. */
export interface IconButtonProps
  extends Omit<ButtonProps, "size" | "aria-label" | "children"> {
  label: string;
  children: React.ReactNode;
}

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ label, variant = "ghost", className, children, ...props }, ref) => (
    <Button
      ref={ref}
      variant={variant}
      size="icon"
      aria-label={label}
      title={label}
      className={className}
      {...props}
    >
      {children}
    </Button>
  )
);
IconButton.displayName = "IconButton";

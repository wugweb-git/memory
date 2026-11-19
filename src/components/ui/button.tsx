import * as React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type ButtonVariant = "default" | "outline" | "ghost" | "danger";
type ButtonSize = "default" | "sm" | "lg" | "icon";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Shows a spinner, sets aria-busy and blocks clicks. Keep the label so width does not jump. */
  loading?: boolean;
}

const variantClasses: Record<ButtonVariant, string> = {
  default: "bg-text-primary text-bg-primary hover:bg-text-secondary",
  outline:
    "bg-bg-elevated border border-border-primary text-text-primary hover:bg-bg-secondary",
  ghost:
    "bg-transparent text-text-tertiary hover:bg-bg-secondary hover:text-text-primary",
  danger: "bg-danger text-bg-elevated hover:opacity-90",
};

/** Heights follow the 4/8 rhythm: sm 36, default 40, lg 44. Touch screens floor at 44 in globals.css. */
const sizeClasses: Record<ButtonSize, string> = {
  default: "min-h-10 px-4 py-2 text-sm",
  sm: "min-h-9 px-3 py-2 text-xs",
  lg: "min-h-11 px-6 py-3 text-base",
  icon: "h-10 w-10 p-0",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant = "default", size = "default", type = "button", loading = false, disabled, children, ...props },
    ref
  ) => {
    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-control font-semibold touch-manipulation",
          "transition-[background-color,color,opacity,transform] duration-fast ease-standard",
          "active:scale-[0.98] active:duration-instant",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
          "disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100",
          variantClasses[variant],
          sizeClasses[size],
          className
        )}
        {...props}
      >
        {loading ? <Loader2 size={16} aria-hidden="true" className="motion-safe:animate-spin" /> : null}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";

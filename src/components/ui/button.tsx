import * as React from "react";
import { cn } from "@/lib/utils";

type ButtonVariant = "default" | "outline" | "ghost" | "danger";
type ButtonSize = "default" | "sm" | "lg" | "icon";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const variantClasses: Record<ButtonVariant, string> = {
  default: "bg-text-primary text-bg-primary hover:bg-accent",
  outline:
    "bg-bg-elevated border border-border-primary text-text-primary hover:bg-bg-secondary",
  ghost:
    "bg-transparent text-text-tertiary hover:bg-bg-secondary hover:text-text-primary",
  danger: "bg-danger text-bg-primary hover:opacity-90",
};

const sizeClasses: Record<ButtonSize, string> = {
  default: "min-h-10 px-4 py-2.5 text-sm",
  sm: "min-h-9 px-3 py-2 text-xs",
  lg: "min-h-11 px-6 py-3 text-base",
  icon: "h-10 w-10 p-0",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", type = "button", ...props }, ref) => {
    return (
      <button
        ref={ref}
        type={type}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-40 disabled:cursor-not-allowed",
          variantClasses[variant],
          sizeClasses[size],
          className
        )}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";

import * as React from "react";
import { cn } from "@/lib/utils";

type ButtonVariant = "default" | "outline" | "ghost";
type ButtonSize = "default" | "sm" | "lg" | "icon";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const variantClasses: Record<ButtonVariant, string> = {
  default:
    "bg-accent text-bg-primary hover:bg-accent-high shadow-2xl shadow-accent/40",
  outline:
    "bg-bg-elevated border border-border-secondary text-text-primary hover:bg-bg-secondary",
  ghost: "bg-transparent text-text-tertiary hover:bg-bg-secondary/50 hover:text-text-primary",
};

const sizeClasses: Record<ButtonSize, string> = {
  default: "px-4 py-2.5 text-xs",
  sm: "px-3 py-2 text-[10px]",
  lg: "px-6 py-3 text-sm",
  icon: "h-10 w-10 p-0",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center rounded-2xl font-black uppercase tracking-[0.2em] transition-all disabled:opacity-30 disabled:cursor-not-allowed active:scale-95",
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

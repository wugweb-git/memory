import { ReactNode } from "react";
import { AlertCircle } from "lucide-react";
import { Button } from "./button";

export function M3Page({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
      <div className="rounded-2xl bg-bg-elevated border border-border-secondary p-5">
        <h1 className="text-lg font-semibold text-text-primary">{title}</h1>
        {subtitle ? <p className="text-sm text-text-tertiary mt-1">{subtitle}</p> : null}
      </div>
      {children}
    </div>
  );
}

export function M3Card({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <section className="rounded-2xl bg-bg-elevated border border-border-secondary p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-text-primary">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function M3Button({
  children,
  onClick,
  tone = "primary",
  disabled = false,
  type = "button",
  loading = false,
  className,
  "aria-label": ariaLabel,
}: {
  children: ReactNode;
  onClick?: () => void;
  tone?: "primary" | "secondary";
  disabled?: boolean;
  type?: "button" | "submit";
  /** Optional: shows a spinner and blocks clicks. */
  loading?: boolean;
  className?: string;
  "aria-label"?: string;
}) {
  return (
    <Button
      type={type}
      onClick={onClick}
      disabled={disabled}
      loading={loading}
      variant={tone === "primary" ? "default" : "outline"}
      size="default"
      aria-label={ariaLabel}
      className={`min-h-11 ${className ?? ""}`}
    >
      {children}
    </Button>
  );
}

export function M3State({ state, message }: { state: "loading" | "error" | "empty"; message: string }) {
  const color = state === "error" ? "text-danger" : "text-text-tertiary";
  return (
    <p
      className={`flex items-start gap-2 text-sm ${color}`}
      role={state === "error" ? "alert" : "status"}
      aria-live={state === "error" ? "assertive" : "polite"}
      aria-busy={state === "loading" || undefined}
    >
      {state === "error" ? <AlertCircle size={16} aria-hidden="true" className="mt-0.5 shrink-0" /> : null}
      <span>{message}</span>
    </p>
  );
}

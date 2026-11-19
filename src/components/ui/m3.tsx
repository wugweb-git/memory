import { ReactNode } from "react";
import { AlertTriangle, Inbox, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/primitives";

/* M3* components are the page-level wrappers pages already use. They now delegate
   to the shared primitives so spacing, radius and motion have one source. */

export function M3Page({
  title,
  subtitle,
  actions,
  children,
}: {
  title: string;
  subtitle?: string;
  /** Optional header actions (buttons, filters). Wraps below the title on phones. */
  actions?: ReactNode;
  children: ReactNode;
}) {
  // AppShell already supplies the page gutter, so only vertical rhythm lives here.
  return (
    <div className="max-w-3xl mx-auto py-2 md:py-4 space-y-4">
      <PageHeader title={title} subtitle={subtitle} actions={actions} />
      {children}
    </div>
  );
}

export function M3Card({
  title,
  children,
  action,
  description,
}: {
  title: string;
  children: ReactNode;
  action?: ReactNode;
  description?: string;
}) {
  return (
    <section className="rounded-panel bg-bg-elevated border border-border-secondary p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-2xs font-semibold uppercase tracking-widest text-text-tertiary">{title}</h2>
          {description ? <p className="mt-1 text-xs text-text-tertiary">{description}</p> : null}
        </div>
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
}: {
  children: ReactNode;
  onClick?: () => void;
  tone?: "primary" | "secondary";
  disabled?: boolean;
  type?: "button" | "submit";
}) {
  return (
    <Button
      type={type}
      onClick={onClick}
      disabled={disabled}
      variant={tone === "primary" ? "default" : "outline"}
      size="lg"
    >
      {children}
    </Button>
  );
}

/** Loading, error and empty feedback. Each state has an icon plus text, not colour alone.
 *  Error uses role=alert; loading and empty use role=status. */
export function M3State({ state, message }: { state: "loading" | "error" | "empty"; message: string }) {
  const color = state === "error" ? "text-danger" : "text-text-tertiary";
  return (
    <p className={`flex items-center gap-2 text-sm ${color}`} role={state === "error" ? "alert" : "status"}>
      {state === "loading" ? (
        <Loader2 size={16} aria-hidden="true" className="shrink-0 motion-safe:animate-spin" />
      ) : state === "error" ? (
        <AlertTriangle size={16} aria-hidden="true" className="shrink-0" />
      ) : (
        <Inbox size={16} aria-hidden="true" className="shrink-0" />
      )}
      <span>{message}</span>
    </p>
  );
}

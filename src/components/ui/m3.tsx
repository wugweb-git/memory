import { ReactNode } from "react";

export function M3Page({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
      <div className="rounded-3xl bg-bg-elevated border border-border-secondary p-5">
        <h1 className="text-lg font-semibold text-text-primary">{title}</h1>
        {subtitle ? <p className="text-sm text-text-tertiary mt-1">{subtitle}</p> : null}
      </div>
      {children}
    </div>
  );
}

export function M3Card({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <section className="rounded-3xl bg-bg-elevated border border-border-secondary p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-2xs font-semibold uppercase tracking-widest text-text-tertiary">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function M3Button({ children, onClick, tone = "primary", disabled = false, type = "button" }: { children: ReactNode; onClick?: () => void; tone?: "primary" | "secondary"; disabled?: boolean; type?: "button" | "submit" }) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`min-h-11 px-4 py-2 rounded-xl text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
        tone === "primary"
          ? "bg-text-primary text-bg-primary hover:bg-accent"
          : "border border-border-primary text-text-primary bg-bg-elevated hover:bg-bg-secondary"
      } disabled:opacity-40 disabled:cursor-not-allowed`}
    >
      {children}
    </button>
  );
}

export function M3State({ state, message }: { state: "loading" | "error" | "empty"; message: string }) {
  const color = state === "error" ? "text-danger" : "text-text-tertiary";
  return (
    <p className={`text-sm ${color}`} role={state === "error" ? "alert" : "status"}>
      {message}
    </p>
  );
}

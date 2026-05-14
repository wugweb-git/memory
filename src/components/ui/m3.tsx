import { ReactNode } from "react";

export function M3Page({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
      <div className="rounded-3xl bg-white/90 border border-border-secondary p-5 shadow-sm">
        <h1 className="text-lg font-black uppercase italic">{title}</h1>
        {subtitle ? <p className="text-sm text-text-tertiary mt-1">{subtitle}</p> : null}
      </div>
      {children}
    </div>
  );
}

export function M3Card({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <section className="rounded-3xl bg-white border border-border-secondary p-4 shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-black uppercase tracking-widest text-text-tertiary">{title}</h2>
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
      className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wide transition ${
        tone === "primary" ? "bg-black text-white" : "border border-border-primary text-text-primary bg-white"
      } disabled:opacity-40 disabled:cursor-not-allowed`}
    >
      {children}
    </button>
  );
}

export function M3State({ state, message }: { state: "loading" | "error" | "empty"; message: string }) {
  const color = state === "error" ? "text-danger" : "text-text-tertiary";
  return <p className={`text-sm ${color}`}>{message}</p>;
}

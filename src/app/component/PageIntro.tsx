import type { ReactNode } from "react";

/**
 * Page head block for the core routes (console, memory, buffer, history).
 * Material 3 mapping: the shell top bar carries the small app-bar title, so the page h1 is
 * "title large" (text-xl, 22px) with a "body medium" supporting line. Actions wrap under the
 * title on phones. Exactly one h1 per page. Swap for the shared PageHeader once it lands.
 */
export function PageIntro({
  title,
  description,
  status,
  actions,
}: {
  title: string;
  description?: string;
  /** Optional live status line (for example connection state). */
  status?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
      <div className="min-w-0 flex-1 basis-56">
        <h1 className="text-xl font-semibold tracking-tight text-text-primary">{title}</h1>
        {description ? <p className="mt-1 text-sm text-text-secondary">{description}</p> : null}
        {status}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </header>
  );
}

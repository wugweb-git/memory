import type { ReactNode } from 'react';

/* Local list building blocks for the integrations, system and admin pages.
   Material 3 list pattern: a title above a tonal surface, rows of at least 56px
   separated by dividers. Meant to be replaced by the shared Section / ListRow once
   those exist in src/components/ui. Token-driven; no new radius values. */

/** Section: 16px title (and optional one-line hint) above one surface that holds the rows. */
export function ListSection({
  id,
  title,
  hint,
  action,
  children,
  bare = false,
}: {
  id: string;
  title: string;
  hint?: ReactNode;
  /** Trailing control in the section header, e.g. Refresh. */
  action?: ReactNode;
  children: ReactNode;
  /** No inner padding: children are rows that bring their own padding. */
  bare?: boolean;
}) {
  return (
    <section aria-labelledby={id} className="space-y-2">
      <div className="flex items-start justify-between gap-3 px-1">
        <div className="min-w-0">
          <h2 id={id} className="text-base font-semibold text-text-primary">{title}</h2>
          {hint ? <p className="mt-0.5 text-sm text-text-tertiary">{hint}</p> : null}
        </div>
        {action}
      </div>
      <div className={`overflow-hidden rounded-panel border border-border-secondary bg-bg-elevated ${bare ? '' : 'space-y-3 p-4'}`}>
        {children}
      </div>
    </section>
  );
}

/** Divided list: rows share one surface, 1px dividers, no nested cards. */
export function RowList({ label, children, className = '' }: { label?: string; children: ReactNode; className?: string }) {
  return (
    <ul aria-label={label} className={`divide-y divide-border-secondary ${className}`}>
      {children}
    </ul>
  );
}

/** Row: leading slot, 16px title, 13px supporting text, trailing slot. At least 56px tall. */
export function ListRow({
  leading,
  title,
  supporting,
  trailing,
  id,
}: {
  leading?: ReactNode;
  title: ReactNode;
  supporting?: ReactNode;
  trailing?: ReactNode;
  id?: string;
}) {
  return (
    <li className="flex min-h-14 items-center gap-3 px-4 py-2">
      {leading ? <div className="shrink-0">{leading}</div> : null}
      <div id={id} className="min-w-0 flex-1">
        <p className="text-base font-medium text-text-primary break-words">{title}</p>
        {supporting ? <p className="text-sm text-text-tertiary break-words">{supporting}</p> : null}
      </div>
      {trailing ? <div className="shrink-0">{trailing}</div> : null}
    </li>
  );
}

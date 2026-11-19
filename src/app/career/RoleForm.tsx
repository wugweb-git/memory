'use client';

import { useId, useState } from "react";

export type RoleFormValues = {
  title: string;
  company: string;
  date: string;
  industries: string[];
  originalLogic: string;
  perspective2026: string;
};

export type SaveState = "idle" | "saving" | "saved" | "failed";

export const emptyRoleForm: RoleFormValues = {
  title: "",
  company: "",
  date: "",
  industries: [],
  originalLogic: "",
  perspective2026: "",
};

const MAX_TITLE = 120;
const MAX_TEXT = 2000;

export function validateRole(v: RoleFormValues): Partial<Record<keyof RoleFormValues, string>> {
  const e: Partial<Record<keyof RoleFormValues, string>> = {};
  if (!v.title.trim()) e.title = "Enter the role title.";
  else if (v.title.length > MAX_TITLE) e.title = `Keep the title under ${MAX_TITLE} characters.`;
  if (v.originalLogic.length > MAX_TEXT) e.originalLogic = `Keep this under ${MAX_TEXT} characters.`;
  if (v.perspective2026.length > MAX_TEXT) e.perspective2026 = `Keep this under ${MAX_TEXT} characters.`;
  return e;
}

const inputCls =
  "w-full min-h-[44px] rounded-xl border bg-bg-elevated px-3 py-2 text-base text-text-primary placeholder:text-text-tertiary focus:outline-none focus-visible:ring-2 focus-visible:ring-accent";

function Field({
  id, label, hint, error, optional, children,
}: { id: string; label: string; hint?: string; error?: string; optional?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-text-primary mb-1">
        {label}
        {optional ? <span className="ml-1 text-xs font-normal text-text-tertiary">Optional</span> : null}
      </label>
      {children}
      {error ? (
        <p id={`${id}-err`} role="alert" className="mt-1 text-xs text-danger">{error}</p>
      ) : hint ? (
        <p id={`${id}-hint`} className="mt-1 text-xs text-text-tertiary">{hint}</p>
      ) : null}
    </div>
  );
}

/** Chip input: Enter or comma adds, Backspace on empty removes the last. */
function ChipInput({
  id, values, onChange, placeholder, describedBy,
}: { id: string; values: string[]; onChange: (n: string[]) => void; placeholder?: string; describedBy?: string }) {
  const [draft, setDraft] = useState("");

  function add(raw: string) {
    const v = raw.trim();
    if (v && !values.some((x) => x.toLowerCase() === v.toLowerCase())) onChange([...values, v]);
    setDraft("");
  }

  return (
    <div className="w-full min-h-[44px] rounded-xl border border-border-primary bg-bg-elevated p-1.5 flex flex-wrap gap-1.5 items-center focus-within:ring-2 focus-within:ring-accent">
      {values.map((v) => (
        <span key={v} className="inline-flex items-center gap-1 text-xs font-medium pl-3 rounded-lg bg-bg-secondary border border-border-secondary text-text-secondary">
          {v}
          <button
            type="button"
            onClick={() => onChange(values.filter((x) => x !== v))}
            aria-label={`Remove ${v}`}
            className="min-h-[44px] min-w-[44px] -my-1.5 flex items-center justify-center text-text-tertiary hover:text-danger focus:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-lg"
          >
            <span aria-hidden="true">×</span>
          </button>
        </span>
      ))}
      <input
        id={id}
        aria-describedby={describedBy}
        enterKeyHint="done"
        className="flex-1 min-w-[10ch] min-h-[40px] px-2 text-base outline-none bg-transparent text-text-primary placeholder:text-text-tertiary"
        value={draft}
        placeholder={values.length === 0 ? placeholder : "Add another"}
        onChange={(e) => {
          const val = e.target.value;
          if (val.includes(",")) {
            val.split(",").forEach((p, i, arr) => { if (i < arr.length - 1) add(p); else setDraft(p); });
          } else setDraft(val);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") { e.preventDefault(); add(draft); }
          else if (e.key === "Backspace" && draft === "" && values.length > 0) onChange(values.slice(0, -1));
        }}
        onBlur={() => add(draft)}
      />
    </div>
  );
}

export function RoleForm({
  values, onChange, onSubmit, onCancel, saveState, isEditing, errorMessage,
}: {
  values: RoleFormValues;
  onChange: (next: RoleFormValues) => void;
  onSubmit: () => void;
  onCancel: () => void;
  saveState: SaveState;
  isEditing: boolean;
  errorMessage?: string;
}) {
  const uid = useId();
  const [touched, setTouched] = useState(false);
  const errors = touched ? validateRole(values) : {};
  const set = <K extends keyof RoleFormValues>(k: K, v: RoleFormValues[K]) => onChange({ ...values, [k]: v });
  const border = (k: keyof RoleFormValues) => (errors[k] ? "border-danger" : "border-border-primary");
  const saving = saveState === "saving";

  const ids = {
    title: `${uid}-title`, company: `${uid}-company`, date: `${uid}-date`,
    ind: `${uid}-ind`, logic: `${uid}-logic`, persp: `${uid}-persp`,
  };

  return (
    <form
      aria-label={isEditing ? "Edit role" : "Add role"}
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        setTouched(true);
        if (Object.keys(validateRole(values)).length === 0) onSubmit();
      }}
      className="rounded-2xl border border-border-secondary bg-bg-secondary mb-4"
    >
      <div className="p-4 space-y-6">
        <fieldset className="space-y-3">
          <legend className="text-md font-semibold text-text-primary mb-1">Role</legend>
          <Field id={ids.title} label="Role title" error={errors.title} hint="The title as you would put it on a CV.">
            <input
              id={ids.title} required aria-required="true" aria-invalid={!!errors.title}
              aria-describedby={errors.title ? `${ids.title}-err` : `${ids.title}-hint`}
              autoComplete="organization-title" maxLength={MAX_TITLE + 20}
              className={`${inputCls} ${border("title")}`} placeholder="Founder and systems architect"
              value={values.title} onChange={(e) => set("title", e.target.value)}
            />
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field id={ids.company} label="Company" optional hint="Where you worked.">
              <input
                id={ids.company} aria-describedby={`${ids.company}-hint`} autoComplete="organization"
                className={`${inputCls} border-border-primary`} placeholder="Company name"
                value={values.company} onChange={(e) => set("company", e.target.value)}
              />
            </Field>
            <Field id={ids.date} label="Dates" optional hint="Free text, for example 2020 to present.">
              <input
                id={ids.date} aria-describedby={`${ids.date}-hint`}
                className={`${inputCls} border-border-primary`} placeholder="2020 to present"
                value={values.date} onChange={(e) => set("date", e.target.value)}
              />
            </Field>
          </div>
          <Field id={ids.ind} label="Industries" optional hint="Press Enter or comma after each one.">
            <ChipInput
              id={ids.ind} describedBy={`${ids.ind}-hint`} values={values.industries}
              onChange={(v) => set("industries", v)} placeholder="Fintech, healthcare"
            />
          </Field>
        </fieldset>

        <fieldset className="space-y-3">
          <legend className="text-md font-semibold text-text-primary mb-1">Story</legend>
          <Field id={ids.logic} label="What you did" optional error={errors.originalLogic}
            hint="The original logic: the problem, your approach and the result.">
            <textarea
              id={ids.logic} rows={4} aria-invalid={!!errors.originalLogic}
              aria-describedby={errors.originalLogic ? `${ids.logic}-err` : `${ids.logic}-hint`}
              className={`${inputCls} ${border("originalLogic")}`}
              value={values.originalLogic} onChange={(e) => set("originalLogic", e.target.value)}
            />
            <p className="mt-1 text-xs text-text-tertiary text-right" aria-hidden="true">{values.originalLogic.length}/{MAX_TEXT}</p>
          </Field>
          <Field id={ids.persp} label="What it means now" optional error={errors.perspective2026}
            hint="How you see that role today, with hindsight.">
            <textarea
              id={ids.persp} rows={3} aria-invalid={!!errors.perspective2026}
              aria-describedby={errors.perspective2026 ? `${ids.persp}-err` : `${ids.persp}-hint`}
              className={`${inputCls} ${border("perspective2026")}`}
              value={values.perspective2026} onChange={(e) => set("perspective2026", e.target.value)}
            />
            <p className="mt-1 text-xs text-text-tertiary text-right" aria-hidden="true">{values.perspective2026.length}/{MAX_TEXT}</p>
          </Field>
        </fieldset>
      </div>

      {/* Sticky on phones so Save stays reachable while typing; static from sm up. */}
      <div className="sticky bottom-0 z-10 flex items-center gap-3 rounded-b-2xl border-t border-border-primary bg-bg-elevated px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <button
          type="submit" disabled={saving}
          className="min-h-[44px] px-5 rounded-xl bg-text-primary text-bg-elevated text-sm font-semibold disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
        >
          {saving ? "Saving…" : isEditing ? "Save changes" : "Add to career tree"}
        </button>
        <button
          type="button" onClick={onCancel} disabled={saving}
          className="min-h-[44px] px-4 rounded-xl border border-border-primary text-sm font-medium text-text-primary disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          Cancel
        </button>
        <p role="status" aria-live="polite" className={`text-xs ${saveState === "failed" ? "text-danger" : "text-text-tertiary"}`}>
          {saveState === "saving" ? "Saving…" : saveState === "saved" ? "Saved" : saveState === "failed" ? (errorMessage || "Could not save. Try again.") : ""}
        </p>
      </div>
    </form>
  );
}

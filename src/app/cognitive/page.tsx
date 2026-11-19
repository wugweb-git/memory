'use client';

import { useRef, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Brain, Zap, Target, BarChart2, History, ListOrdered } from 'lucide-react';
import { AppShell } from '@/app/component/AppShell';
import { DecideTab } from './_components/DecideTab';
import { EvaluateTab } from './_components/EvaluateTab';
import { PrioritizeTab } from './_components/PrioritizeTab';
import { GapsTab } from './_components/GapsTab';
import { HistoryTab } from './_components/HistoryTab';

type Mode = 'architect' | 'founder' | 'operator';
type SubTab = 'decide' | 'evaluate' | 'rank' | 'gaps' | 'history';

const SUB_TABS: Array<{ id: SubTab; label: string; icon: LucideIcon }> = [
  { id: 'decide', label: 'Decide', icon: Zap },
  { id: 'evaluate', label: 'Evaluate', icon: Target },
  { id: 'rank', label: 'Rank', icon: ListOrdered },
  { id: 'gaps', label: 'Gaps', icon: BarChart2 },
  { id: 'history', label: 'History', icon: History },
];

export default function CognitivePage() {
  // Single-mode engine: the owner opted out of the mode selector; the API still accepts `mode`.
  const mode: Mode = 'operator';
  const [subTab, setSubTab] = useState<SubTab>('decide');
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  // WAI-ARIA tabs: arrows/Home/End move focus and activate (roving tabindex).
  function onTabKeyDown(e: React.KeyboardEvent, index: number) {
    const last = SUB_TABS.length - 1;
    let next = -1;
    if (e.key === 'ArrowRight') next = index === last ? 0 : index + 1;
    else if (e.key === 'ArrowLeft') next = index === 0 ? last : index - 1;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = last;
    if (next < 0) return;
    e.preventDefault();
    const id = SUB_TABS[next].id;
    setSubTab(id);
    tabRefs.current[id]?.focus();
  }

  return (
    <AppShell>
      <div className="w-full max-w-2xl mx-auto px-4 md:px-6 py-6 space-y-6 pb-24 md:pb-6">
        <header className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-secondary border border-border-secondary flex items-center justify-center shrink-0">
            <Brain size={17} className="text-text-tertiary" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-text-primary">Cognitive engine</h1>
            <p className="text-sm text-text-tertiary">Decide, evaluate and rank using your memory. Nothing here changes it.</p>
          </div>
        </header>

        <div role="tablist" aria-label="Cognitive tools" className="grid grid-cols-5 gap-1 rounded-2xl bg-secondary p-1">
          {SUB_TABS.map((t, i) => {
            const Icon = t.icon;
            const active = subTab === t.id;
            return (
              <button
                key={t.id}
                ref={(el) => { tabRefs.current[t.id] = el; }}
                id={`cog-tab-${t.id}`}
                type="button"
                role="tab"
                aria-selected={active}
                aria-controls={`cog-panel-${t.id}`}
                tabIndex={active ? 0 : -1}
                onKeyDown={(e) => onTabKeyDown(e, i)}
                onClick={() => setSubTab(t.id)}
                className={`min-h-12 rounded-xl flex flex-col items-center justify-center gap-0.5 text-2xs font-medium transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                  active ? 'bg-bg-elevated text-text-primary shadow-sm' : 'text-text-tertiary hover:text-text-primary'
                }`}
              >
                <Icon size={16} aria-hidden="true" />
                {t.label}
              </button>
            );
          })}
        </div>

        <div role="tabpanel" key={subTab} id={`cog-panel-${subTab}`} aria-labelledby={`cog-tab-${subTab}`} tabIndex={0} className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-xl">
          {subTab === 'decide' && <DecideTab mode={mode} />}
          {subTab === 'evaluate' && <EvaluateTab mode={mode} />}
          {subTab === 'rank' && <PrioritizeTab mode={mode} />}
          {subTab === 'gaps' && <GapsTab />}
          {subTab === 'history' && <HistoryTab />}
        </div>
      </div>
    </AppShell>
  );
}

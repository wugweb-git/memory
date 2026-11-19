'use client';

/* Living reference for the shared UI kit (owner-only, under /system/components).
   Every block below is the real component, so this page is also the visual regression
   surface for states. Contract and rules: docs/ux-audit/foundation.md. */

import { useState } from 'react';
import { Inbox } from 'lucide-react';
import { toast } from 'react-toastify';
import { AppShell } from '@/app/component/AppShell';
import { AppToastContainer } from '@/app/component/AppToastContainer';
import { Button, IconButton } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { M3Card } from '@/components/ui/m3';
import {
  ActionBar,
  Badge,
  Card,
  Chip,
  EmptyState,
  ErrorState,
  FilterChip,
  FormField,
  Input,
  ListGroup,
  ListRow,
  LoadingState,
  PageHeader,
  SegmentedTabs,
  Section,
  Select,
  Skeleton,
  Stack,
  StatusPill,
  Textarea,
} from '@/components/ui/primitives';

function Usage({ children }: { children: React.ReactNode }) {
  return <p className="text-xs text-text-tertiary">{children}</p>;
}

export default function ComponentsReference() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState('a');
  const [on, setOn] = useState(false);
  const [loading, setLoading] = useState(false);
  return (
    <AppShell>
      <AppToastContainer />
      <Stack>
        <PageHeader
          title="Components"
          description="The shared kit with every variant and state. Use these instead of one-off markup."
          actions={<Button size="sm" variant="outline" onClick={() => toast.success('Saved')}>Show toast</Button>}
        />

        <Section title="Buttons" description="Button, IconButton. Sizes sm 40, default 44, lg 48 (primary action), icon 44 by 44.">
          <div className="flex flex-wrap gap-2">
            <Button id="b-default">Default</Button>
            <Button id="b-sm" size="sm" variant="outline">Small</Button>
            <Button id="b-lg" size="lg">Large</Button>
            <Button id="b-tonal" variant="tonal">Tonal</Button>
            <Button id="b-outline" variant="outline">Outline</Button>
            <Button id="b-ghost" variant="ghost">Ghost</Button>
            <Button id="b-danger" variant="danger">Delete</Button>
            <Button id="b-disabled" disabled>Disabled</Button>
            <Button
              id="b-loading"
              loading={loading}
              onClick={() => {
                setLoading(true);
                setTimeout(() => setLoading(false), 800);
              }}
            >
              Save
            </Button>
            <IconButton id="b-icon" label="Inbox"><Inbox size={20} aria-hidden="true" /></IconButton>
          </div>
          <Usage>One filled button per screen. Destructive actions use danger and a ConfirmDialog.</Usage>
        </Section>

        <Section title="Form block" description="FormField wires label, hint, error and aria props onto Input, Textarea or Select.">
          <div className="space-y-4">
            <FormField id="f-name" label="Name" hint="As on your card" required><Input defaultValue="" /></FormField>
            <FormField id="f-err" label="Email" error="Enter a valid email"><Input defaultValue="x" /></FormField>
            <FormField id="f-sel" label="Type"><Select defaultValue="a"><option value="a">A</option><option value="b">B</option></Select></FormField>
            <FormField id="f-ta" label="Notes"><Textarea /></FormField>
            <FormField id="f-ro" label="Read only"><Input readOnly defaultValue="Stored value" /></FormField>
            <Input id="f-dis" disabled defaultValue="Disabled" aria-label="Disabled field" />
          </div>
          <Usage>Controls are 44px tall with 16px text on phones. Never use placeholder as the label.</Usage>
        </Section>

        <Section title="Tabs and chips" description="SegmentedTabs (roving tabindex, arrows), FilterChip, Chip, Badge, StatusPill.">
          <SegmentedTabs
            idBase="h"
            label="Demo"
            value={tab}
            onChange={setTab}
            items={[{ value: 'a', label: 'One' }, { value: 'b', label: 'Two', count: 3 }, { value: 'c', label: 'Three' }]}
          />
          <div className="flex flex-wrap items-center gap-2">
            <FilterChip pressed={on} onClick={() => setOn(!on)}>Filter</FilterChip>
            <Chip tone="accent">Accent</Chip>
            <Badge tone="success">Badge</Badge>
            <StatusPill tone="warning">Needs setup</StatusPill>
          </div>
        </Section>

        <Section title="List block" description="ListGroup and ListRow: 56px, 72px with supporting text, whole row tappable.">
          <ListGroup>
            <ListRow icon={<Inbox size={20} />} title="Link row" supporting="Supporting text" href="/more" />
            <ListRow title="Button row" onClick={() => toast.success('Saved')} />
            <ListRow title="Static row" trailing="Value" />
          </ListGroup>
        </Section>

        <Section title="Card block" description="Card (outlined, filled, elevated) and M3Card (titled panel).">
          <Card variant="filled">Filled card</Card>
          <Card variant="elevated">Elevated card</Card>
          <M3Card title="M3Card" description="Titled panel with an optional action">Body content</M3Card>
        </Section>

        <Section title="Empty, error and loading blocks">
          <EmptyState title="Nothing here yet" hint="Add something to get started." action={<Button size="sm">Add</Button>} />
          <ErrorState title="Could not load" hint="Check your connection and try again." action={<Button size="sm" variant="outline">Retry</Button>} />
          <LoadingState label="Loading items" />
          <Skeleton className="h-14 w-full" />
        </Section>

        <Section title="Confirm block and action bar">
          <Button id="open-dialog" variant="danger" onClick={() => setOpen(true)}>Open dialog</Button>
          <ActionBar>
            <Button variant="ghost">Cancel</Button>
            <Button>Save changes</Button>
          </ActionBar>
        </Section>
      </Stack>
      <ConfirmDialog
        open={open}
        title="Delete item"
        description="This cannot be undone."
        confirmLabel="Delete"
        tone="danger"
        onConfirm={() => setOpen(false)}
        onCancel={() => setOpen(false)}
      />
    </AppShell>
  );
}

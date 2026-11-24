import {
  Command, Brain, Database, Archive, Layers, Sparkles, FileText, History,
  Settings, Cpu, LayoutDashboard, User, Eye, Activity, Link2, Briefcase,
  MessageSquare, Zap, ShieldCheck,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { IDENTITY_CONFIG } from '@/config/identity';
import { featureEnabled, type FeatureKey } from '@/config/features';

/** Global app chrome */
export const APP_BRAND = {
  name: 'Identity Prism',
  tagline: 'Neural OS',
  statusLabel: 'Active',
} as const;

/** Top-level route navigation (standalone pages) */
export const APP_NAV_ITEMS: ReadonlyArray<{
  href: string;
  label: string;
  icon: LucideIcon;
}> = [
  { href: '/', label: 'Console', icon: Command },
  { href: '/ask', label: 'Ask', icon: Brain },
  { href: '/memory', label: 'Memory', icon: Database },
  { href: '/buffer', label: 'Buffer', icon: Archive },
  { href: '/cognitive', label: 'Cognitive', icon: Layers },
  { href: '/persona', label: 'Persona', icon: Sparkles },
  { href: '/content', label: 'Content', icon: FileText },
  { href: '/history', label: 'History', icon: History },
  { href: '/system', label: 'System', icon: Settings },
] as const;

/** In-app section navigation (main workspace) */
export const WORKSPACE_NAV = [
  {
    group: 'Identity',
    items: [
      { id: 'overview', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'profile', label: 'Profile', icon: User },
      { id: 'twin', label: 'Digital Twin', icon: Brain },
      { id: 'showcase', label: 'Public Showcase', icon: Eye },
    ],
  },
  {
    group: 'Data',
    items: [
      { id: 'memory', label: 'Memory Vault', icon: Database },
      { id: 'buffer', label: 'Buffer Queue', icon: Archive },
      { id: 'activity', label: 'Activity', icon: Activity },
    ],
  },
  {
    group: 'Intelligence',
    items: [
      { id: 'cognitive', label: 'Cognitive Engine', icon: Cpu },
      { id: 'persona', label: 'Persona', icon: Sparkles },
    ],
  },
  {
    group: 'System',
    items: [
      { id: 'syncs', label: 'Integrations', icon: Link2 },
      { id: 'settings', label: 'Settings', icon: Settings },
    ],
  },
] as const;

export const SIDEBAR_STATS = [
  { label: 'Uplink', value: 'Live', colorClass: 'text-accent' },
  { label: 'Integrity', value: 'Nominal', colorClass: 'text-success' },
] as const;

/** Unified route-based navigation — single source of truth for the app shell.
 *  Grouped sidebar (desktop) + mobile drawer all read from this.
 *  Groups use plain language: Workspace (daily use), Intelligence (the thinking
 *  layers), Output (what you publish), Admin (setup and access). `hint` is a
 *  short plain-language description shown in the mobile drawer. */
export type NavItem = { href: string; label: string; icon: LucideIcon; hint?: string; feature?: FeatureKey };
export type NavGroup = { group: string; items: ReadonlyArray<NavItem> };

/** Full nav definition. `feature` tags gate visibility via MVP flags; untagged
 *  items are core and always shown. Filtered exports are derived below. */
const RAW_NAV_GROUPS: ReadonlyArray<NavGroup> = [
  {
    group: 'Workspace',
    items: [
      { href: '/console', label: 'Console', icon: LayoutDashboard, hint: 'Your overview for today' },
      { href: '/ask', label: 'Ask', icon: MessageSquare, hint: 'Ask your memory a question', feature: 'ask' },
      { href: '/memory', label: 'Memory', icon: Database, hint: 'Everything you have saved', feature: 'memory' },
      { href: '/buffer', label: 'Buffer', icon: Archive, hint: 'Captured items waiting to be sorted', feature: 'buffer' },
      { href: '/history', label: 'History', icon: History, hint: 'Past decisions and activity', feature: 'history' },
    ],
  },
  {
    group: 'Intelligence',
    items: [
      { href: '/cognitive', label: 'Cognitive', icon: Cpu, hint: 'How the system weighs your goals', feature: 'cognitive' },
      { href: '/persona', label: 'Persona', icon: Sparkles, hint: 'Who you are becoming', feature: 'persona' },
      { href: '/career', label: 'Career', icon: Briefcase, hint: 'Roles, skills and next moves', feature: 'career' },
    ],
  },
  {
    group: 'Output',
    items: [
      { href: '/content', label: 'Content', icon: FileText, hint: 'Draft and publish posts' },
      { href: '/portfolio', label: 'Portfolio', icon: Eye, hint: 'Your showcase projects' },
      { href: `/p/${IDENTITY_CONFIG.HANDLE}`, label: 'Profile', icon: User, hint: 'Your public page' },
    ],
  },
  {
    group: 'Admin',
    items: [
      { href: '/integrations', label: 'Integrations', icon: Link2, hint: 'Connect accounts and sources' },
      { href: '/integrations/credentials', label: 'Integration credentials', icon: Link2, hint: 'Keys for Notion, Google, Spotify' },
      { href: '/integrations/publishing', label: 'Publishing accounts', icon: Link2, hint: 'Tokens for posting to social' },
      { href: '/system', label: 'System', icon: Settings, hint: 'Modules, health and access', feature: 'system' },
      { href: '/admin', label: 'Admin', icon: ShieldCheck, hint: 'Owner settings', feature: 'admin' },
    ],
  },
];

/** Nav groups with feature-disabled items (and now-empty groups) removed. */
export const NAV_GROUPS: ReadonlyArray<NavGroup> = RAW_NAV_GROUPS
  .map((g) => ({ ...g, items: g.items.filter((i) => featureEnabled(i.feature)) }))
  .filter((g) => g.items.length > 0);

/** Primary mobile bottom-bar items: the top four destinations (feature-filtered).
 *  Ask lives in the More list, not here. The shell appends a fifth "More" tab. */
const RAW_MOBILE_DOCK_ITEMS: ReadonlyArray<NavItem> = [
  { href: '/console', label: 'Console', icon: LayoutDashboard },
  { href: '/memory', label: 'Memory', icon: Database, feature: 'memory' },
  { href: '/content', label: 'Content', icon: FileText },
  { href: '/buffer', label: 'Buffer', icon: Archive, feature: 'buffer' },
];

export const MOBILE_DOCK_MAX = 4;

export const MOBILE_DOCK_ITEMS: ReadonlyArray<NavItem> = RAW_MOBILE_DOCK_ITEMS
  .filter((i) => featureEnabled(i.feature))
  .slice(0, MOBILE_DOCK_MAX);

/** Route matching shared by the sidebar, drawer, dock and topbar title.
 *  `/` is the console. Matching is segment-aware, so `/content` never matches `/console`. */
export function isNavActive(pathname: string, href: string): boolean {
  if (href === '/console' && pathname === '/') return true;
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Resolve the nav item for a path (longest href wins) to label the topbar. */
export function findNavItem(pathname: string): NavItem | undefined {
  let best: NavItem | undefined;
  for (const group of RAW_NAV_GROUPS) {
    for (const item of group.items) {
      if (isNavActive(pathname, item.href) && (!best || item.href.length > best.href.length)) best = item;
    }
  }
  return best;
}

export const CHAT_HIGHLIGHT_KEYWORDS = [
  'AI', 'Fintech', 'Identity', 'UX', 'Architecture', 'Prism', 'RAG', 'Vector',
] as const;

export const INDUSTRIES = [
  { id: '1', name: 'Systems Architect', count: 42 },
  { id: '2', name: 'Fintech', count: 18 },
  { id: '3', name: 'UX/Product', count: 25 },
  { id: '4', name: 'AI Engineering', count: 33 },
  { id: '5', name: 'Life Coaching', count: 12 },
  { id: '6', name: 'Marketing', count: 15 },
  { id: '7', name: 'F&B Strategy', count: 9 },
  { id: '8', name: 'Product Delivery', count: 21 },
  { id: '9', name: '0→1 Thinking', count: 14 },
  { id: '10', name: 'Tech/DevOps', count: 28 },
  { id: '11', name: 'Digital Identity', count: 7 },
  { id: '12', name: 'Salesforce CRM', count: 14 },
] as const;

export const IDENTITY_PILLARS = [
  {
    id: 'origin',
    label: 'Origin_Spirit',
    title: 'Architecture & Logic',
    content:
      'My journey began in the physical world of architecture, where I learned that every structure is a materialized logic map. Today, I build digital ontologies that ingest complex signals and synthesize them into professional clarity.',
    accent: 'text-accent',
  },
  {
    id: 'philosophy',
    label: 'Philosophy_Core',
    title: 'Proof of Human Logic',
    content:
      'In an AI-saturated world, the ultimate advantage is Signature Logic. I build systems where AI serves as infrastructure while human spirit provides the vector.',
    accent: 'text-success',
  },
  {
    id: 'stack',
    label: 'Neural_Stack',
    title: 'RAG-Enabled Cognitive Mapping',
    content:
      'My stack is a living RAG implementation where every venture node is a vector. I use Neural Atlas Search to make cross-industry experience instantly retrievable.',
    accent: 'text-warning',
  },
] as const;

export const PUBLIC_PROFILE_SERVICES = [
  {
    title: 'Priority DM',
    description: '2 days reply guaranteed',
    price: 'FREE',
    popular: false,
    tab: 'Priority_Uplink' as const,
  },
  {
    title: 'Cognitive Architecture Review',
    description: 'Video meeting • 45 mins',
    price: '₹2,500',
    popular: true,
    tab: '1:1_Neural_Sync' as const,
  },
] as const;

export const PUBLIC_PROFILE_TESTIMONIALS = [
  {
    content:
      "The Prism OS has completely redefined how I manage my cognitive load. It's not just a portfolio; it's an extension of my intellect.",
    author: 'Recommended by d on LinkedIn',
    avatarSeed: 'd',
  },
  {
    content:
      "The architect's insights into systems architecture are unparalleled. The Digital Twin integration is a game-changer.",
    author: 'swz // developer',
    avatarSeed: 'swz',
  },
] as const;

/**
 * Real first-run steps for the owner. Ids start at 101 so rows saved under the
 * old placeholder checklist (ids 1 to 14) are ignored instead of resurfacing.
 * A step shows a check only once the owner marks it done.
 */
export const ADMIN_ONBOARDING_CHECKLIST = [
  { id: 101, text: 'Connect a source (GitHub, YouTube or a feed) on Integrations', completed: false },
  { id: 102, text: 'Capture a first note in the Buffer', completed: false },
  { id: 103, text: 'Promote a reviewed buffer item to memory', completed: false },
  { id: 104, text: 'Check that memory search works (embedded packets above zero)', completed: false },
  { id: 105, text: 'Choose which notes Ask may quote under Public notes', completed: false },
  { id: 106, text: 'Add your public profile details and publish it', completed: false },
  { id: 107, text: 'Add a passkey for sign-in on System', completed: false },
  { id: 108, text: 'Add publishing tokens for the channels you use', completed: false },
] as const;

export const OUTPUT_PLATFORMS = [
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'blog', label: 'Blog post' },
  { value: 'medium', label: 'Medium' },
  { value: 'portfolio', label: 'Portfolio' },
  { value: 'x', label: 'X' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'substack', label: 'Substack (post it yourself)' },
  { value: 'behance', label: 'Behance (post it yourself)' },
  { value: 'dribbble', label: 'Dribbble (post it yourself)' },
  { value: 'memo', label: 'Memo' },
] as const;

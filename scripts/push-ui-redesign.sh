#!/bin/bash
# Run from repo root: bash scripts/push-ui-redesign.sh
set -e
cd /Users/abcom/Documents/GitHub/memory

git add -A
git commit -m "redesign: complete UI/IA overhaul — sidebar nav, clean typography, fix overlaps

WHAT CHANGED:
- page.tsx: complete rewrite with left sidebar layout (ml-60)
- Sidebar.tsx: new component replacing top StatusHUD
  - Human-readable nav: Dashboard, Profile, Digital Twin, Public Showcase,
    Memory Vault, Buffer Queue, Activity, Cognitive Engine, Persona,
    Integrations & Syncs, Settings
  - Grouped: Identity / Data / Intelligence / System
  - User block at bottom with name + notifications
- StatusHUD.tsx: deprecated, kept as no-op stub for import compat

FIXED BUGS:
- Fixed bottom chat dock no longer overlaps page content (now inline)
- BlobBuffer and VentureVault no longer overlap (separate sections)
- IdentityShowcase no longer covered by chat dock
- kinetic-text hover transform removed (was causing random jitter)

NEW SECTIONS:
- Overview/Dashboard with stats, quick actions, recent activity, layer status
- Digital Twin: inline chat interface, no fixed overlay
- Persona: trait scores, synthesized bio, positioning keywords, style patterns
- Syncs: all integration statuses in one table + external links consolidated
- Settings: profile prefs, notifications, Layer 3 read-only config, danger zone

TYPOGRAPHY:
- Removed 8-9px tracking text mixed with 3xl italic uppercase headings
- Consistent hierarchy: text-xl font-bold titles, text-sm body, text-[11px] meta
- SectionLabel component for consistent 11px uppercase group labels
- PageWrap component for consistent page headers"

git push
echo "✅ UI redesign pushed to GitHub"

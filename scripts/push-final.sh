#!/bin/bash
set -e
cd /Users/abcom/Documents/GitHub/memory

git add -A
git commit -m "fix: mobile UX, design token consistency, glass panel restoration

MOBILE UX (was entirely missing):
- Sidebar: hidden md:flex — invisible on mobile
- TopNav: left-0 on mobile, left-60 on md+ (responsive)
- MobileNav.tsx: NEW persistent bottom dock for mobile
  - 6 primary tabs: Home, Memory, Twin, Activity, Cognitive, More
  - Glass-panel frosted base + safe-area-inset-bottom padding
  - Active state: filled black pill with white icon + label
  - pb-24 on main content to clear the dock
- TopNav: hamburger icon on mobile

DESIGN TOKEN CONSISTENCY:
- ALL page sections now use porcelain CSS token system:
  bg-bg-primary (#F5F5F0), bg-secondary (#EDEDE8), bg-bg-elevated (#FFF)
  glass-panel (white gradient + blur + shadow)
  border-border-secondary (rgba(0,0,0,0.04))
  text-text-primary/secondary/tertiary/disabled
  text-accent / text-success / text-warning / text-danger
- Removed ALL hardcoded #EBEBEB/#F0F0F0/#1A1A1A/#999 from page.tsx
- StatCard: glass-panel + rounded-[2rem] + border-border-secondary
- PageShell: glass hierarchy with proper token usage
- Section dividers: divide-border-secondary/60 (matches components)
- Hover states: hover:bg-secondary/30 (porcelain warm stone)
- Active states: bg-accent-high text-bg-primary

SIDEBAR POLISH:
- Active nav item: bg-accent-high (black) text-bg-primary (matches old UI)
- Brand: font-black uppercase italic 'Identity Prism' 
- Status dot: bg-success animate-pulse
- Token-based colors throughout

TOPNAV POLISH:
- glass-panel base (not plain white)
- Secondary/tertiary token colors
- Command palette uses glass-panel + token colors
- All hardcoded colors replaced with tokens

LAYOUT FIXES:
- main: md:ml-60 mt-14 pb-24 md:pb-0
- TopNav: left-0 md:left-60 (fixes mobile overlap)
- Sidebar: hidden md:flex fixed (never shows on mobile)
- No more content overlap"

git push
echo "✅ Pushed"

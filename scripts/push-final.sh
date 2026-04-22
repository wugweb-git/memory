#!/bin/bash
set -e
cd /Users/abcom/Documents/GitHub/memory

git add -A
git commit -m "feat: top navbar, upload fix, glass aesthetic restored, full function IA map

TOP NAVBAR (TopNav.tsx):
- Fixed h-14 bar right of sidebar, above content
- Breadcrumb with current section icon + desc
- Global search bar (⌘K) → command palette
- Command palette: navigate all 11 sections + 5 quick actions
- New button → opens palette for quick actions
- Notifications badge
- User avatar

UPLOAD FIX (MemoryVaultWithUpload.tsx):
- New MemoryVaultWithUpload component replaces static MemoryVault
- Working drop zone → POST /api/upload with real progress bar
- Animated states: idle → dragging → uploading → success/error
- Uploads immediately appear in list
- Accepts: PDF, TXT, DOC, HTML, JSON, MD
- Storage stats panel shows real packet count

LAYOUT:
- Sidebar (w-60, left-0, fixed)
- TopNav (left-60, top-0, fixed, h-14)
- Main (ml-60 mt-14, scrollable)
- No more fixed bottom chat dock overlapping content
- Digital Twin chat is inline/scrollable

SECTIONS FULLY MAPPED:
- Dashboard → stats, quick access, activity, layer status
- Profile → ProfileHeader, Pillars, Sectors, Works, Pipeline, Vault, Matrix
- Digital Twin → inline RAG chat (no overlay)
- Public Showcase → IdentityShowcase tabs
- Memory Vault → MemoryVaultWithUpload (real upload)
- Buffer Queue → BlobBuffer (real /api/blob)
- Activity → VoiceIngestion + ActivityLog + InspirationHub + NeuralConnections
- Cognitive Engine → CognitiveConsole
- Persona → Trait scores, bio, keywords, style patterns
- Integrations → IntegrationMatrix + sync status table + external links
- Settings → Profile, Notifications, L3 config (read-only), Danger zone

GLASS AESTHETIC RESTORED:
- glass-panel, glass-card classes throughout
- border-border-secondary shadows
- bg-secondary/30 alternating surfaces
- accent/10 hover states
- Consistent font hierarchy (text-xl font-bold titles, text-sm body)"

git push
echo "✅ Pushed"

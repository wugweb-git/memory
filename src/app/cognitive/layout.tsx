import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Cognitive' };

export default function CognitiveLayout({ children }: { children: React.ReactNode }) {
  return children;
}

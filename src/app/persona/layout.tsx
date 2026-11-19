import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Persona' };

export default function PersonaLayout({ children }: { children: React.ReactNode }) {
  return children;
}

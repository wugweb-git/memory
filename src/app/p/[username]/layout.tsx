import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Public profile' };

export default function PublicProfileLayout({ children }: { children: React.ReactNode }) {
  return children;
}

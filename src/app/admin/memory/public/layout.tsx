import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Public memory admin' };

export default function AdminMemoryPublicLayout({ children }: { children: React.ReactNode }) {
  return children;
}

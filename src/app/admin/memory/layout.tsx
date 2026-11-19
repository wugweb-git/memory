import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Memory admin' };

export default function AdminMemoryLayout({ children }: { children: React.ReactNode }) {
  return children;
}

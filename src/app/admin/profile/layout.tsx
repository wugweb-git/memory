import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Profile admin' };

export default function AdminProfileLayout({ children }: { children: React.ReactNode }) {
  return children;
}
